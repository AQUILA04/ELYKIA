package com.optimize.elykia.core.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

/**
 * Manifest JSON stocké dans MinIO ({channel}/manifest.json).
 */
@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class MobileAppReleaseManifestDto {
    private String version;
    private int versionCode;
    private int minSupportedVersionCode;
    private boolean mandatory;
    private String releaseNotes;
    private String apkObjectKey;
    private String sha256;
    private long sizeBytes;
    private String publishedAt;
}
