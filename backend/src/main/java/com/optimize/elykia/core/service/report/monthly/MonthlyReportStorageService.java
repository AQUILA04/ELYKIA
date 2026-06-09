package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.client.storage.MinioStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MonthlyReportStorageService {

    private final MinioStorageService minioStorageService;
    private final MinioProperties minioProperties;

    public boolean isAvailable() {
        return minioStorageService.isAvailable();
    }

    public String getReportsBucket() {
        return minioProperties.getReportsBucket();
    }

    public void upload(String objectKey, byte[] data) {
        minioStorageService.uploadObject(minioProperties.getReportsBucket(), objectKey, data, "application/pdf");
    }

    public byte[] download(String storageKey) {
        return minioStorageService.downloadObject(minioProperties.getReportsBucket(), storageKey);
    }

    public void delete(String storageKey) {
        minioStorageService.deleteObject(minioProperties.getReportsBucket(), storageKey);
    }
}
