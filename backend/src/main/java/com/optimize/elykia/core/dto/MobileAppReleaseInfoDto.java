package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Informations de release exposées à l'application mobile.
 */
@Getter
@Builder
public class MobileAppReleaseInfoDto {
    private final String version;
    private final int versionCode;
    private final int minSupportedVersionCode;
    private final boolean mandatory;
    private final String releaseNotes;
    private final String sha256;
    private final long sizeBytes;
    private final String publishedAt;
    private final boolean updateAvailable;
    private final boolean updateRequired;
    private final int clientVersionCode;
}
