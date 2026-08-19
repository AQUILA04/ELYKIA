package com.optimize.elykia.core.service.mobile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.client.storage.MinioStorageService;
import com.optimize.elykia.core.dto.MobileAppReleaseInfoDto;
import com.optimize.elykia.core.dto.MobileAppReleaseManifestDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

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
class MobileAppReleaseServiceTest {

    @Mock private MinioStorageService minioStorageService;
    @Mock private MinioProperties minioProperties;
    @Mock private ObjectMapper objectMapper;

    @Test
    void getLatestReleaseInfo_distinguishesOptionalAndRequiredUpdateFromManifestVersionPolicy() throws Exception {
        // Given
        MobileAppReleaseService service = service();
        MobileAppReleaseManifestDto manifest = validManifest();
        stubManifest(manifest);

        // When
        MobileAppReleaseInfoDto optionalUpdate = service.getLatestReleaseInfo(11);
        MobileAppReleaseInfoDto mandatoryUpdate = service.getLatestReleaseInfo(7);
        MobileAppReleaseInfoDto currentVersion = service.getLatestReleaseInfo(12);

        // Then
        assertEquals("2.4.0", optionalUpdate.getVersion());
        assertEquals(12, optionalUpdate.getVersionCode());
        assertEquals(8, optionalUpdate.getMinSupportedVersionCode());
        assertTrue(optionalUpdate.isUpdateAvailable());
        assertEquals(false, optionalUpdate.isUpdateRequired());
        assertTrue(mandatoryUpdate.isUpdateAvailable());
        assertTrue(mandatoryUpdate.isUpdateRequired());
        assertEquals(false, currentVersion.isUpdateAvailable());
        assertEquals(false, currentVersion.isUpdateRequired());
        assertEquals(11, optionalUpdate.getClientVersionCode());
    }

    @Test
    void loadManifest_rejectsMissingManifestBeforeAnyDownload() {
        // Given
        MobileAppReleaseService service = service();
        when(minioProperties.getMobileReleasesBucket()).thenReturn("mobile-releases");
        when(minioProperties.getMobileReleaseChannel()).thenReturn("prod");
        when(minioStorageService.objectExists("mobile-releases", "prod/manifest.json")).thenReturn(false);

        // When
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, service::loadManifest);

        // Then
        assertTrue(exception.getMessage().contains("Aucune version mobile"));
        verify(minioStorageService, never()).downloadObject(any(), any());
    }

    @Test
    void loadManifest_rejectsManifestWithoutIntegrityOrArtifactPrerequisites() throws Exception {
        // Given
        MobileAppReleaseService service = service();
        MobileAppReleaseManifestDto invalid = validManifest();
        invalid.setSha256(" ");
        stubManifest(invalid);

        // When
        ApplicationException exception = assertThrows(ApplicationException.class, service::loadManifest);

        // Then
        assertTrue(exception.getMessage().contains("sha256 manquant"));
    }

    @Test
    void openLatestApkStream_rejectsMissingArtifactEvenWhenManifestIsValid() throws Exception {
        // Given
        MobileAppReleaseService service = service();
        MobileAppReleaseManifestDto manifest = validManifest();
        stubManifest(manifest);
        when(minioStorageService.objectExists("mobile-releases", "prod/elykia-2.4.0.apk")).thenReturn(false);

        // When
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, service::openLatestApkStream);

        // Then
        assertTrue(exception.getMessage().contains("Fichier APK introuvable"));
        verify(minioStorageService, never()).openObjectStream(any(), any());
    }

    private MobileAppReleaseService service() {
        return new MobileAppReleaseService(minioStorageService, minioProperties, objectMapper);
    }

    private void stubManifest(MobileAppReleaseManifestDto manifest) throws Exception {
        when(minioProperties.getMobileReleasesBucket()).thenReturn("mobile-releases");
        when(minioProperties.getMobileReleaseChannel()).thenReturn("prod");
        when(minioStorageService.objectExists("mobile-releases", "prod/manifest.json")).thenReturn(true);
        when(minioStorageService.downloadObject("mobile-releases", "prod/manifest.json")).thenReturn("{}".getBytes());
        when(objectMapper.readValue(any(byte[].class), eq(MobileAppReleaseManifestDto.class))).thenReturn(manifest);
    }

    private MobileAppReleaseManifestDto validManifest() {
        MobileAppReleaseManifestDto manifest = new MobileAppReleaseManifestDto();
        manifest.setVersion("2.4.0");
        manifest.setVersionCode(12);
        manifest.setMinSupportedVersionCode(8);
        manifest.setMandatory(true);
        manifest.setReleaseNotes("Corrections stock et recouvrement");
        manifest.setApkObjectKey("prod/elykia-2.4.0.apk");
        manifest.setSha256("a".repeat(64));
        manifest.setSizeBytes(10_240L);
        manifest.setPublishedAt("2026-08-19T12:00:00Z");
        return manifest;
    }
}
