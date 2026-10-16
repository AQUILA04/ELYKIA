package com.optimize.elykia.core.service.store;

import com.optimize.elykia.client.storage.MinioProperties;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.http.Method;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * URL MinIO de courte durée pour les photos d'articles. Le navigateur peut les mettre dans une balise img.
 */
@Service
@Slf4j
public class ArticlePhotoUrlService {

    private final MinioProperties minioProperties;
    private final int expiryMinutes;
    private final int cacheMarginMinutes;
    private MinioClient signingClient;
    private final ConcurrentHashMap<String, CachedUrl> urlCache = new ConcurrentHashMap<>();

    public ArticlePhotoUrlService(
            MinioProperties minioProperties,
            @Value("${elykia.photos.presign-expiry-minutes:60}") int expiryMinutes) {
        this.minioProperties = minioProperties;
        this.expiryMinutes = Math.max(1, expiryMinutes);
        this.cacheMarginMinutes = Math.max(1, this.expiryMinutes / 6);
    }

    @PostConstruct
    void initSigningClient() {
        String publicUrl = minioProperties.getPublicUrl();
        if (!StringUtils.hasText(publicUrl)) {
            log.warn("minio.public-url est vide — les photos d'articles ne pourront pas être signées");
            return;
        }
        this.signingClient = MinioClient.builder()
                .endpoint(publicUrl)
                .region("us-east-1")
                .credentials(minioProperties.getAccessKey(), minioProperties.getSecretKey())
                .build();
    }

    public String presign(String objectKey) {
        if (!StringUtils.hasText(objectKey)) {
            return null;
        }
        try {
            return getOrCreate(objectKey).url();
        } catch (Exception e) {
            log.error("Signature de photo d'article impossible pour {}: {}", objectKey, e.getMessage());
            return null;
        }
    }

    public void evict(String objectKey) {
        if (StringUtils.hasText(objectKey)) {
            urlCache.remove(objectKey);
        }
    }

    private CachedUrl getOrCreate(String objectKey) throws Exception {
        Instant now = Instant.now();
        CachedUrl existing = urlCache.get(objectKey);
        if (existing != null && existing.usableUntil().isAfter(now)) {
            return existing;
        }
        if (signingClient == null) {
            throw new IllegalStateException("Client de signature MinIO non configuré (minio.public-url)");
        }
        int expirySeconds = expiryMinutes * 60;
        String url = signingClient.getPresignedObjectUrl(
                GetPresignedObjectUrlArgs.builder()
                        .method(Method.GET)
                        .bucket(minioProperties.getArticlesBucket())
                        .object(objectKey)
                        .expiry(expirySeconds)
                        .build());
        Instant expiresAt = now.plusSeconds(expirySeconds);
        Instant usableUntil = expiresAt.minusSeconds(cacheMarginMinutes * 60L);
        if (usableUntil.isBefore(now.plusSeconds(30))) {
            usableUntil = now.plusSeconds(30);
        }
        CachedUrl created = new CachedUrl(url, usableUntil);
        urlCache.put(objectKey, created);
        return created;
    }

    private record CachedUrl(String url, Instant usableUntil) {
    }
}
