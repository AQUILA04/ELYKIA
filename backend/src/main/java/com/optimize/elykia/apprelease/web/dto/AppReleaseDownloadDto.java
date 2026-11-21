package com.optimize.elykia.apprelease.web.dto;

import lombok.Builder;
import lombok.Getter;

import java.io.InputStream;

/**
 * Données nécessaires pour servir le téléchargement APK d'une release.
 */
@Getter
@Builder
public class AppReleaseDownloadDto {
    private final InputStream apkStream;
    private final String filename;
    private final long sizeBytes;
    private final String sha256;
}
