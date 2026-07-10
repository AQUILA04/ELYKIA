package com.optimize.elykia.core.service.customer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.client.storage.MinioProperties;
import com.optimize.elykia.client.storage.MinioStorageService;
import com.optimize.elykia.core.dto.AppReleaseDownloadDto;
import com.optimize.elykia.core.dto.MobileAppReleaseInfoDto;
import com.optimize.elykia.core.dto.MobileAppReleaseManifestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerAppReleaseService {

    private static final String MANIFEST_FILE = "manifest.json";

    private final MinioStorageService minioStorageService;
    private final MinioProperties minioProperties;
    private final ObjectMapper objectMapper;

    public MobileAppReleaseInfoDto getLatestReleaseInfo(int clientVersionCode) {
        MobileAppReleaseManifestDto manifest = loadManifest();
        boolean updateAvailable = manifest.getVersionCode() > clientVersionCode;
        boolean updateRequired = clientVersionCode < manifest.getMinSupportedVersionCode();

        return MobileAppReleaseInfoDto.builder()
                .version(manifest.getVersion())
                .versionCode(manifest.getVersionCode())
                .minSupportedVersionCode(manifest.getMinSupportedVersionCode())
                .mandatory(manifest.isMandatory())
                .releaseNotes(manifest.getReleaseNotes())
                .sha256(manifest.getSha256())
                .sizeBytes(manifest.getSizeBytes())
                .publishedAt(manifest.getPublishedAt())
                .updateAvailable(updateAvailable)
                .updateRequired(updateRequired)
                .clientVersionCode(clientVersionCode)
                .build();
    }

    public MobileAppReleaseManifestDto loadManifest() {
        String manifestKey = manifestObjectKey();
        String bucket = minioProperties.getCustomerSpaceReleasesBucket();

        if (!minioStorageService.objectExists(bucket, manifestKey)) {
            throw new ResourceNotFoundException("Aucune version espace client publiée pour le canal " + releaseChannel());
        }

        try {
            byte[] data = minioStorageService.downloadObject(bucket, manifestKey);
            MobileAppReleaseManifestDto manifest = objectMapper.readValue(data, MobileAppReleaseManifestDto.class);
            validateManifest(manifest);
            return manifest;
        } catch (ResourceNotFoundException | ApplicationException e) {
            throw e;
        } catch (Exception e) {
            log.error("Impossible de lire le manifest espace client: {}", manifestKey, e);
            throw new ApplicationException("Manifest de release espace client invalide");
        }
    }

    public AppReleaseDownloadDto prepareLatestApkDownload() {
        MobileAppReleaseManifestDto manifest = loadManifest();
        String bucket = minioProperties.getCustomerSpaceReleasesBucket();
        String apkKey = manifest.getApkObjectKey();

        if (!minioStorageService.objectExists(bucket, apkKey)) {
            throw new ResourceNotFoundException("Fichier APK introuvable pour la version " + manifest.getVersion());
        }

        long sizeBytes = manifest.getSizeBytes() > 0
                ? manifest.getSizeBytes()
                : minioStorageService.getObjectSize(bucket, apkKey);

        return AppReleaseDownloadDto.builder()
                .apkStream(minioStorageService.openObjectStream(bucket, apkKey))
                .filename("elykia-customer-" + releaseChannel() + "-v" + manifest.getVersion() + ".apk")
                .sizeBytes(sizeBytes)
                .sha256(manifest.getSha256())
                .build();
    }

    public InputStream openLatestApkStream() {
        return prepareLatestApkDownload().getApkStream();
    }

    public long getLatestApkSize() {
        MobileAppReleaseManifestDto manifest = loadManifest();
        return minioStorageService.getObjectSize(
                minioProperties.getCustomerSpaceReleasesBucket(),
                manifest.getApkObjectKey());
    }

    public String getLatestApkFilename() {
        MobileAppReleaseManifestDto manifest = loadManifest();
        return "elykia-customer-" + releaseChannel() + "-v" + manifest.getVersion() + ".apk";
    }

    public String getLatestApkSha256() {
        return loadManifest().getSha256();
    }

    private void validateManifest(MobileAppReleaseManifestDto manifest) {
        if (manifest.getVersion() == null || manifest.getVersion().isBlank()) {
            throw new ApplicationException("Manifest espace client: version manquante");
        }
        if (manifest.getVersionCode() <= 0) {
            throw new ApplicationException("Manifest espace client: versionCode invalide");
        }
        if (manifest.getApkObjectKey() == null || manifest.getApkObjectKey().isBlank()) {
            throw new ApplicationException("Manifest espace client: apkObjectKey manquant");
        }
        if (manifest.getSha256() == null || manifest.getSha256().isBlank()) {
            throw new ApplicationException("Manifest espace client: sha256 manquant");
        }
    }

    private String manifestObjectKey() {
        return releaseChannel() + "/" + MANIFEST_FILE;
    }

    private String releaseChannel() {
        return minioProperties.getCustomerSpaceReleaseChannel();
    }
}
