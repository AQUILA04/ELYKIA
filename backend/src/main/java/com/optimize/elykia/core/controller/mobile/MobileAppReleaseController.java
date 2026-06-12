package com.optimize.elykia.core.controller.mobile;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.mobile.MobileAppReleaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;

@RestController
@RequestMapping("api/v1/mobile/app/release")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Mise à jour application mobile")
public class MobileAppReleaseController {

    private final MobileAppReleaseService mobileAppReleaseService;

    @GetMapping("/latest")
    @Operation(summary = "Vérifier la dernière version mobile disponible")
    public ResponseEntity<Response> getLatestRelease(
            @RequestParam(name = "versionCode") int versionCode) {
        log.info("Vérification release mobile — versionCode client={}", versionCode);
        var info = mobileAppReleaseService.getLatestReleaseInfo(versionCode);
        return new ResponseEntity<>(
                ResponseUtil.successResponse(info, resolveStatusMessage(info.isUpdateAvailable(), info.isUpdateRequired())),
                HttpStatus.OK);
    }

    @GetMapping("/download")
    @Operation(summary = "Télécharger l'APK de la dernière version mobile")
    public ResponseEntity<Resource> downloadLatestApk() {
        InputStream apkStream = mobileAppReleaseService.openLatestApkStream();
        String filename = mobileAppReleaseService.getLatestApkFilename();
        long size = mobileAppReleaseService.getLatestApkSize();
        String sha256 = mobileAppReleaseService.getLatestApkSha256();

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        headers.add("X-APK-SHA256", sha256);

        return ResponseEntity.ok()
                .headers(headers)
                .contentLength(size)
                .contentType(MediaType.parseMediaType("application/vnd.android.package-archive"))
                .body(new InputStreamResource(apkStream));
    }

    private String resolveStatusMessage(boolean updateAvailable, boolean updateRequired) {
        if (updateRequired) {
            return "Une mise à jour obligatoire est disponible.";
        }
        if (updateAvailable) {
            return "Une nouvelle version est disponible.";
        }
        return "L'application est à jour.";
    }
}
