package com.optimize.elykia.client.storage;

import com.optimize.common.entities.exception.ApplicationException;
import io.minio.*;
import io.minio.messages.Bucket;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.util.List;

@Service
@Slf4j
public class MinioStorageServiceImpl implements MinioStorageService {

    private final MinioProperties minioProperties;
    private final MinioClient minioClient;

    public MinioStorageServiceImpl(MinioProperties minioProperties) {
        this.minioProperties = minioProperties;
        this.minioClient = MinioClient.builder()
                .endpoint(minioProperties.getEndpoint())
                .credentials(minioProperties.getAccessKey(), minioProperties.getSecretKey())
                .build();
    }

    @PostConstruct
    public void initBucket() {
        try {
            boolean found = minioClient.bucketExists(
                    BucketExistsArgs.builder().bucket(minioProperties.getBucket()).build());
            if (!found) {
                minioClient.makeBucket(
                        MakeBucketArgs.builder().bucket(minioProperties.getBucket()).build());
                log.info("Bucket '{}' created", minioProperties.getBucket());
            }
        } catch (Exception e) {
            log.warn("Impossible de vérifier/créer le bucket MinIO '{}': {}. Les uploads iront en fallback outbox.",
                    minioProperties.getBucket(), e.getMessage());
        }
    }

    @Override
    public String uploadPhoto(String objectKey, byte[] data, String contentType) {
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object(objectKey)
                            .stream(new ByteArrayInputStream(data), data.length, -1)
                            .contentType(contentType)
                            .build());
            return buildUrl(objectKey);
        } catch (Exception e) {
            log.error("Erreur lors de l'upload vers MinIO: key={}", objectKey, e);
            throw new ApplicationException("Service de stockage photo indisponible");
        }
    }

    @Override
    public void deletePhoto(String objectKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object(objectKey)
                            .build());
        } catch (Exception e) {
            log.error("Erreur lors de la suppression de l'objet MinIO: key={}", objectKey, e);
            throw new ApplicationException("Service de stockage photo indisponible");
        }
    }

    @Override
    public boolean exists(String objectKey) {
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object(objectKey)
                            .build());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean isAvailable() {
        try {
            minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(minioProperties.getBucket())
                            .object("dummy-health-check")
                            .build());
            return true;
        } catch (Exception e) {
            try {
                List<Bucket> buckets = minioClient.listBuckets();
                return buckets.stream().anyMatch(b -> b.name().equals(minioProperties.getBucket()));
            } catch (Exception e2) {
                return false;
            }
        }
    }

    private String buildUrl(String objectKey) {
        String publicUrl = minioProperties.getPublicUrl();
        if (publicUrl == null) {
            publicUrl = minioProperties.getEndpoint();
        }
        return publicUrl + "/" + minioProperties.getBucket() + "/" + objectKey;
    }
}
