package com.optimize.elykia.core.service.store;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.client.storage.MinioStorageService;
import com.optimize.elykia.core.entity.article.ArticleType;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.repository.ArticleTypeRepository;
import com.optimize.elykia.core.repository.ArticlesRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticlePhotoServiceTest {

    @Mock private ArticlePhotoCompressor compressor;
    @Mock private ArticlePhotoUrlService urlService;
    @Mock private MinioStorageService minioStorageService;
    @Mock private ArticlesRepository articlesRepository;
    @Mock private ArticleTypeRepository articleTypeRepository;

    private ArticlePhotoService service;

    @BeforeEach
    void setUp() {
        MinioProperties properties = new MinioProperties();
        properties.setArticlesBucket("elykia-articles");
        service = new ArticlePhotoService(
                compressor, urlService, minioStorageService, properties, articlesRepository, articleTypeRepository);
    }

    @Test
    void viewForArticles_prefersArticlePhotoThenTypePhoto() {
        Articles own = article(1L, "TV", "articles/1.jpg");
        Articles inherited = article(2L, "TV", null);
        Articles none = article(3L, "Radio", null);
        ArticleType type = new ArticleType();
        type.setName("TV");
        type.setState(State.ENABLED);
        type.setPhotoObjectKey("article-types/9.jpg");

        when(articleTypeRepository.findByNameIn(any())).thenReturn(List.of(type));
        when(urlService.presign("articles/1.jpg")).thenReturn("https://signed/article");
        when(urlService.presign("article-types/9.jpg")).thenReturn("https://signed/type");
        when(urlService.presign(null)).thenReturn(null);

        var views = service.viewForArticles(List.of(own, inherited, none));

        assertEquals("https://signed/article", views.get(1L).photoUrl());
        assertEquals("https://signed/article", views.get(1L).displayPhotoUrl());
        assertNull(views.get(2L).photoUrl());
        assertEquals("https://signed/type", views.get(2L).displayPhotoUrl());
        assertNull(views.get(3L).photoUrl());
        assertNull(views.get(3L).displayPhotoUrl());
    }

    @Test
    void uploadArticle_storesOnlyCompressedJpeg() {
        Articles article = article(4L, "TV", null);
        when(articlesRepository.findById(4L)).thenReturn(Optional.of(article));
        when(articlesRepository.save(article)).thenReturn(article);
        when(compressor.compress(any())).thenReturn(new byte[] {1, 2, 3});

        service.uploadArticle(4L, new byte[] {9, 9});

        verify(minioStorageService).uploadObject(eq("elykia-articles"), eq("articles/4.jpg"), eq(new byte[] {1, 2, 3}), eq("image/jpeg"));
        assertEquals("articles/4.jpg", article.getPhotoObjectKey());
        verify(minioStorageService, never()).uploadPhoto(anyString(), any(), anyString());
    }

    @Test
    void deleteArticle_removesObjectAndClearsKey() {
        Articles article = article(4L, "TV", "articles/4.jpg");
        when(articlesRepository.findById(4L)).thenReturn(Optional.of(article));
        when(articlesRepository.save(article)).thenReturn(article);
        when(minioStorageService.objectExists("elykia-articles", "articles/4.jpg")).thenReturn(true);

        service.deleteArticle(4L);

        verify(minioStorageService).deleteObject("elykia-articles", "articles/4.jpg");
        assertNull(article.getPhotoObjectKey());
    }

    private static Articles article(Long id, String type, String photoKey) {
        Articles article = new Articles();
        article.setId(id);
        article.setType(type);
        article.setPhotoObjectKey(photoKey);
        return article;
    }
}
