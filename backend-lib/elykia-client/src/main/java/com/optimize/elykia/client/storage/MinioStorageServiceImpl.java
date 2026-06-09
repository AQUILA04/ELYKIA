package com.optimize.elykia.client.storage;

import com.optimize.common.entities.exception.ApplicationException;
import io.minio.*;
import io.minio.messages.Bucket;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
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
        initBucketIfMissing(minioProperties.getBucket());
        initBucketIfMissing(minioProperties.getReportsBucket());
    }

    @Override
    public String uploadPhoto(String objectKey, byte[] data, String contentType) {
        return uploadObject(minioProperties.getBucket(), objectKey, data, contentType);
    }

    @Override
    public String uploadObject(String bucket, String objectKey, byte[] data, String contentType) {
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .stream(new ByteArrayInputStream(data), data.length, -1)
                            .contentType(contentType)
                            .build());
            return buildUrl(bucket, objectKey);
        } catch (Exception e) {
            log.error("Erreur lors de l'upload vers MinIO: bucket={}, key={}", bucket, objectKey, e);
            throw new ApplicationException("Service de stockage MinIO indisponible");
        }
    }

    @Override
    public void deletePhoto(String objectKey) {
        deleteObject(minioProperties.getBucket(), objectKey);
    }

    @Override
    public byte[] downloadObject(String bucket, String objectKey) {
        try {
            try (GetObjectResponse response = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .build());
                 ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                response.transferTo(output);
                return output.toByteArray();
            }
        } catch (Exception e) {
            log.error("Erreur lors du téléchargement MinIO: bucket={}, key={}", bucket, objectKey, e);
            throw new ApplicationException("Service de stockage MinIO indisponible");
        }
    }

    @Override
    public void deleteObject(String bucket, String objectKey) {
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .build());
        } catch (Exception e) {
            log.error("Erreur lors de la suppression de l'objet MinIO: bucket={}, key={}", bucket, objectKey, e);
            throw new ApplicationException("Service de stockage MinIO indisponible");
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

    private void initBucketIfMissing(String bucketName) {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("Bucket '{}' created", bucketName);
            }
        } catch (Exception e) {
            log.warn("Impossible de vérifier/créer le bucket MinIO '{}': {}", bucketName, e.getMessage());
        }
    }

    private String buildUrl(String bucket, String objectKey) {
        String publicUrl = minioProperties.getPublicUrl();
        if (publicUrl == null) {
            publicUrl = minioProperties.getEndpoint();
        }
        return publicUrl + "/" + bucket + "/" + objectKey;
    }
}
