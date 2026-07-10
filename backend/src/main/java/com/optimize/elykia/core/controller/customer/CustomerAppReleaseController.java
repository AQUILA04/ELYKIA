package com.optimize.elykia.core.controller.customer;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.customer.CustomerAppReleaseService;
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

@RestController
@RequestMapping("api/v1/customer/app/release")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Mise à jour application espace client")
public class CustomerAppReleaseController {

    private final CustomerAppReleaseService customerAppReleaseService;

    @GetMapping("/latest")
    @Operation(summary = "Vérifier la dernière version espace client disponible")
    public ResponseEntity<Response> getLatestRelease(
            @RequestParam(name = "versionCode") int versionCode) {
        log.info("Vérification release espace client — versionCode client={}", versionCode);
        var info = customerAppReleaseService.getLatestReleaseInfo(versionCode);
        return new ResponseEntity<>(
                ResponseUtil.successResponse(info, resolveStatusMessage(info.isUpdateAvailable(), info.isUpdateRequired())),
                HttpStatus.OK);
    }

    @GetMapping("/download")
    @Operation(summary = "Télécharger l'APK de la dernière version espace client")
    public ResponseEntity<Resource> downloadLatestApk() {
        var download = customerAppReleaseService.prepareLatestApkDownload();

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + download.getFilename() + "\"");
        headers.add("X-APK-SHA256", download.getSha256());

        return ResponseEntity.ok()
                .headers(headers)
                .contentLength(download.getSizeBytes())
                .contentType(MediaType.parseMediaType("application/vnd.android.package-archive"))
                .body(new InputStreamResource(download.getApkStream()));
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
