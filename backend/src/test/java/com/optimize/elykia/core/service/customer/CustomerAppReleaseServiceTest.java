package com.optimize.elykia.core.service.customer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.client.storage.MinioStorageService;
import com.optimize.elykia.core.dto.AppReleaseDownloadDto;
import com.optimize.elykia.core.dto.MobileAppReleaseInfoDto;
import com.optimize.elykia.core.dto.MobileAppReleaseManifestDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerAppReleaseServiceTest {

    @Mock private MinioStorageService minioStorageService;
    @Mock private MinioProperties minioProperties;
    @Mock private ObjectMapper objectMapper;

    @Test
    void getLatestReleaseInfo_marksClientBelowMinimumVersionAsRequiredUpdate() throws Exception {
        // Given
        CustomerAppReleaseService service = service();
        stubManifest(manifest(20_480L));

        // When
        MobileAppReleaseInfoDto info = service.getLatestReleaseInfo(4);

        // Then
        assertEquals("1.8.0", info.getVersion());
        assertEquals(8, info.getVersionCode());
        assertEquals(5, info.getMinSupportedVersionCode());
        assertTrue(info.isUpdateAvailable());
        assertTrue(info.isUpdateRequired());
        assertEquals(4, info.getClientVersionCode());
    }

    @Test
    void prepareLatestApkDownload_usesManifestSizeAndBuildsStableCustomerFilename() throws Exception {
        // Given
        CustomerAppReleaseService service = service();
        MobileAppReleaseManifestDto manifest = manifest(20_480L);
        InputStream stream = new ByteArrayInputStream(new byte[] {1, 2, 3});
        stubManifest(manifest);
        when(minioStorageService.objectExists("customer-releases", "prod/customer-1.8.0.apk")).thenReturn(true);
        when(minioStorageService.openObjectStream("customer-releases", "prod/customer-1.8.0.apk")).thenReturn(stream);

        // When
        AppReleaseDownloadDto download = service.prepareLatestApkDownload();

        // Then
        assertSame(stream, download.getApkStream());
        assertEquals("elykia-customer-prod-v1.8.0.apk", download.getFilename());
        assertEquals(20_480L, download.getSizeBytes());
        assertEquals("b".repeat(64), download.getSha256());
        verify(minioStorageService, never()).getObjectSize(any(), any());
    }

    @Test
    void prepareLatestApkDownload_usesStorageSizeWhenManifestSizeIsMissing() throws Exception {
        // Given
        CustomerAppReleaseService service = service();
        MobileAppReleaseManifestDto manifest = manifest(0L);
        InputStream stream = new ByteArrayInputStream(new byte[] {1});
        stubManifest(manifest);
        when(minioStorageService.objectExists("customer-releases", "prod/customer-1.8.0.apk")).thenReturn(true);
        when(minioStorageService.getObjectSize("customer-releases", "prod/customer-1.8.0.apk")).thenReturn(9_999L);
        when(minioStorageService.openObjectStream("customer-releases", "prod/customer-1.8.0.apk")).thenReturn(stream);

        // When
        AppReleaseDownloadDto download = service.prepareLatestApkDownload();

        // Then
        assertEquals(9_999L, download.getSizeBytes());
        assertSame(stream, download.getApkStream());
    }

    @Test
    void prepareLatestApkDownload_rejectsMissingArtifactBeforeOpeningAnyStream() throws Exception {
        // Given
        CustomerAppReleaseService service = service();
        stubManifest(manifest(20_480L));
        when(minioStorageService.objectExists("customer-releases", "prod/customer-1.8.0.apk")).thenReturn(false);

        // When
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                service::prepareLatestApkDownload);

        // Then
        assertTrue(exception.getMessage().contains("Fichier APK introuvable"));
        verify(minioStorageService, never()).openObjectStream(any(), any());
    }

    private CustomerAppReleaseService service() {
        return new CustomerAppReleaseService(minioStorageService, minioProperties, objectMapper);
    }

    private void stubManifest(MobileAppReleaseManifestDto manifest) throws Exception {
        when(minioProperties.getCustomerSpaceReleasesBucket()).thenReturn("customer-releases");
        when(minioProperties.getCustomerSpaceReleaseChannel()).thenReturn("prod");
        when(minioStorageService.objectExists("customer-releases", "prod/manifest.json")).thenReturn(true);
        when(minioStorageService.downloadObject("customer-releases", "prod/manifest.json")).thenReturn("{}".getBytes());
        when(objectMapper.readValue(any(byte[].class), eq(MobileAppReleaseManifestDto.class))).thenReturn(manifest);
    }

    private MobileAppReleaseManifestDto manifest(long sizeBytes) {
        MobileAppReleaseManifestDto manifest = new MobileAppReleaseManifestDto();
        manifest.setVersion("1.8.0");
        manifest.setVersionCode(8);
        manifest.setMinSupportedVersionCode(5);
        manifest.setMandatory(true);
        manifest.setReleaseNotes("Synchronisation comptes clients");
        manifest.setApkObjectKey("prod/customer-1.8.0.apk");
        manifest.setSha256("b".repeat(64));
        manifest.setSizeBytes(sizeBytes);
        return manifest;
    }
}
