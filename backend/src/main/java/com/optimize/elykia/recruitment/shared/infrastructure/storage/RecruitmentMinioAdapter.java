package com.optimize.elykia.recruitment.shared.infrastructure.storage;

import com.optimize.elykia.client.storage.MinioStorageService;
import com.optimize.elykia.recruitment.RecruitmentProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.InputStream;

@Component
@RequiredArgsConstructor
public class RecruitmentMinioAdapter implements RecruitmentStoragePort {

    private final MinioStorageService minioStorageService;
    private final RecruitmentProperties recruitmentProperties;

    @Override
    public StoredOfferImage storeOfferImage(long offerId, byte[] data, String contentType) {
        String bucket = recruitmentProperties.getBucket();
        String ext = RecruitmentObjectKeyBuilder.extensionFromContentType(contentType);
        String key = RecruitmentObjectKeyBuilder.offerCoverKey(offerId, ext);
        String publicUrl = minioStorageService.uploadObject(bucket, key, data, contentType);
        return new StoredOfferImage(bucket, key, publicUrl);
    }

    @Override
    public void deleteOfferImage(String bucket, String key) {
        if (bucket != null && key != null && minioStorageService.objectExists(bucket, key)) {
            minioStorageService.deleteObject(bucket, key);
        }
    }

    @Override
    public void storeApplicationCv(long applicationId, byte[] data, String contentType, String fileName) {
        String bucket = recruitmentProperties.getBucket();
        String ext = RecruitmentObjectKeyBuilder.extensionFromContentType(contentType);
        String key = RecruitmentObjectKeyBuilder.applicationCvKey(applicationId, ext);
        minioStorageService.uploadObject(bucket, key, data, contentType);
    }

    @Override
    public byte[] loadCv(String bucket, String key) {
        return minioStorageService.downloadObject(bucket, key);
    }

    @Override
    public InputStream openCvStream(String bucket, String key) {
        return minioStorageService.openObjectStream(bucket, key);
    }
}
