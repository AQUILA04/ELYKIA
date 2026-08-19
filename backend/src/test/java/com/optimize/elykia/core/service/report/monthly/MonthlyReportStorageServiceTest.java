package com.optimize.elykia.core.service.report.monthly;

import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.client.storage.MinioStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonthlyReportStorageServiceTest {

    @Mock
    private MinioStorageService minioStorageService;
    @Mock
    private MinioProperties minioProperties;
    @InjectMocks
    private MonthlyReportStorageService service;

    @Test
    void isAvailable_delegatesToObjectStorageHealthCheck() {
        // Given
        when(minioStorageService.isAvailable()).thenReturn(true);

        // When
        boolean available = service.isAvailable();

        // Then
        assertEquals(true, available);
        verify(minioStorageService).isAvailable();
    }

    @Test
    void upload_storesPdfInConfiguredReportsBucket() {
        // Given
        byte[] pdf = new byte[]{1, 2, 3};
        when(minioProperties.getReportsBucket()).thenReturn("monthly-reports");

        // When
        service.upload("2026/08/report.pdf", pdf);

        // Then
        verify(minioStorageService).uploadObject("monthly-reports", "2026/08/report.pdf", pdf, "application/pdf");
    }

    @Test
    void download_readsObjectFromConfiguredReportsBucket() {
        // Given
        byte[] expectedPdf = new byte[]{9, 8, 7};
        when(minioProperties.getReportsBucket()).thenReturn("monthly-reports");
        when(minioStorageService.downloadObject("monthly-reports", "2026/08/report.pdf")).thenReturn(expectedPdf);

        // When
        byte[] result = service.download("2026/08/report.pdf");

        // Then
        assertSame(expectedPdf, result);
        verify(minioStorageService).downloadObject("monthly-reports", "2026/08/report.pdf");
    }

    @Test
    void delete_removesObjectFromConfiguredReportsBucket() {
        // Given
        when(minioProperties.getReportsBucket()).thenReturn("monthly-reports");

        // When
        service.delete("2026/08/report.pdf");

        // Then
        verify(minioStorageService).deleteObject("monthly-reports", "2026/08/report.pdf");
    }
}
