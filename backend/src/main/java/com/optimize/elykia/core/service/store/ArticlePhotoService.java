package com.optimize.elykia.core.service.store;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.client.storage.MinioStorageService;
import com.optimize.elykia.core.config.CacheNames;
import com.optimize.elykia.core.entity.article.ArticleType;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.repository.ArticleTypeRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArticlePhotoService {

    private final ArticlePhotoCompressor compressor;
    private final ArticlePhotoUrlService urlService;
    private final MinioStorageService minioStorageService;
    private final MinioProperties minioProperties;
    private final ArticlesRepository articlesRepository;
    private final ArticleTypeRepository articleTypeRepository;

    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public Articles uploadArticle(Long id, byte[] bytes) {
        Articles article = requireArticle(id);
        store(article, ArticlePhotoKeys.article(id), bytes);
        return articlesRepository.save(article);
    }

    @Transactional
    @CacheEvict(cacheNames = {
            CacheNames.ARTICLES_ENABLED_LIST,
            CacheNames.ARTICLES_ALL_LIST,
            CacheNames.ARTICLES_PAGE,
            CacheNames.ARTICLES_ENABLED_PAGE
    }, allEntries = true)
    public Articles deleteArticle(Long id) {
        Articles article = requireArticle(id);
        clear(article);
        return articlesRepository.save(article);
    }

    @Transactional
    public ArticleType uploadType(Long id, byte[] bytes) {
        ArticleType type = requireType(id);
        store(type, ArticlePhotoKeys.type(id), bytes);
        return articleTypeRepository.save(type);
    }

    @Transactional
    public ArticleType deleteType(Long id) {
        ArticleType type = requireType(id);
        clear(type);
        return articleTypeRepository.save(type);
    }

    public void attachArticleUrls(Articles article) {
        if (article == null || article.getId() == null) {
            return;
        }
        ArticlePhotoView view = viewForArticles(List.of(article)).get(article.getId());
        if (view == null) {
            return;
        }
        article.setPhotoUrl(view.photoUrl());
        article.setDisplayPhotoUrl(view.displayPhotoUrl());
    }

    public void attachTypeUrls(Collection<ArticleType> types) {
        if (types == null) {
            return;
        }
        for (ArticleType type : types) {
            String url = urlService.presign(type.getPhotoObjectKey());
            type.setPhotoUrl(url);
            type.setDisplayPhotoUrl(url);
        }
    }

    /**
     * Une seule lecture des types pour tout le lot. La photo de l'article prime sur celle du type de même nom.
     */
    public Map<Long, ArticlePhotoView> viewForArticles(Collection<Articles> articles) {
        if (articles == null || articles.isEmpty()) {
            return Map.of();
        }
        Map<String, String> typePhotoByName = loadTypePhotos(articles);
        Map<Long, ArticlePhotoView> views = new HashMap<>();
        for (Articles article : articles) {
            if (article == null || article.getId() == null) {
                continue;
            }
            String ownKey = article.getPhotoObjectKey();
            String typeKey = typePhotoByName.get(article.getType());
            String displayKey = StringUtils.hasText(ownKey) ? ownKey : typeKey;
            views.put(article.getId(), new ArticlePhotoView(
                    urlService.presign(ownKey),
                    urlService.presign(displayKey)));
        }
        return views;
    }

    private Map<String, String> loadTypePhotos(Collection<Articles> articles) {
        Set<String> names = new HashSet<>();
        for (Articles article : articles) {
            if (article == null || StringUtils.hasText(article.getPhotoObjectKey()) || !StringUtils.hasText(article.getType())) {
                continue;
            }
            names.add(article.getType());
        }
        if (names.isEmpty()) {
            return Map.of();
        }
        Map<String, String> photos = new HashMap<>();
        for (ArticleType type : articleTypeRepository.findByNameIn(names)) {
            if (type.getState() == State.DELETED || !StringUtils.hasText(type.getPhotoObjectKey())) {
                continue;
            }
            photos.put(type.getName(), type.getPhotoObjectKey());
        }
        return photos;
    }

    private void store(Articles article, String newKey, byte[] bytes) {
        byte[] jpeg = compressor.compress(bytes);
        String previous = article.getPhotoObjectKey();
        minioStorageService.uploadObject(bucket(), newKey, jpeg, "image/jpeg");
        removePrevious(previous, newKey);
        article.setPhotoObjectKey(newKey);
        urlService.evict(newKey);
        urlService.evict(previous);
    }

    private void store(ArticleType type, String newKey, byte[] bytes) {
        byte[] jpeg = compressor.compress(bytes);
        String previous = type.getPhotoObjectKey();
        minioStorageService.uploadObject(bucket(), newKey, jpeg, "image/jpeg");
        removePrevious(previous, newKey);
        type.setPhotoObjectKey(newKey);
        urlService.evict(newKey);
        urlService.evict(previous);
    }

    private void clear(Articles article) {
        removePrevious(article.getPhotoObjectKey(), null);
        urlService.evict(article.getPhotoObjectKey());
        article.setPhotoObjectKey(null);
    }

    private void clear(ArticleType type) {
        removePrevious(type.getPhotoObjectKey(), null);
        urlService.evict(type.getPhotoObjectKey());
        type.setPhotoObjectKey(null);
    }

    private void removePrevious(String previous, String replacement) {
        if (!StringUtils.hasText(previous) || previous.equals(replacement)) {
            return;
        }
        try {
            if (minioStorageService.objectExists(bucket(), previous)) {
                minioStorageService.deleteObject(bucket(), previous);
            }
        } catch (Exception e) {
            log.warn("Suppression de l'ancienne photo {} impossible: {}", previous, e.getMessage());
        }
    }

    private String bucket() {
        return minioProperties.getArticlesBucket();
    }

    private Articles requireArticle(Long id) {
        return articlesRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
    }

    private ArticleType requireType(Long id) {
        return articleTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
    }
}
