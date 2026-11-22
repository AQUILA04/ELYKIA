package com.optimize.elykia.company.web;

import com.optimize.elykia.company.application.CompanyProfileService;
import com.optimize.elykia.company.domain.CompanyLogoAsset;
import com.optimize.elykia.company.web.dto.CompanyProfileDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Public endpoints consumed before and after authentication (login screen, app bootstrap,
 * browser favicon/logo) with HTTP conditional ETag caching.
 */
@RestController
@RequestMapping("/api/public/company")
@RequiredArgsConstructor
public class CompanyPublicController {

    private final CompanyProfileService companyProfileService;

    @GetMapping("/branding")
    public ResponseEntity<CompanyProfileDto> getBranding(
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        CompanyProfileDto dto = companyProfileService.getCurrentProfile();
        String etag = dto.etag();

        if (etagMatches(ifNoneMatch, etag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                    .eTag(etag)
                    .cacheControl(CacheControl.noCache().mustRevalidate())
                    .build();
        }

        return ResponseEntity.ok()
                .eTag(etag)
                .cacheControl(CacheControl.noCache().mustRevalidate())
                .body(dto);
    }

    @GetMapping("/logo")
    public ResponseEntity<byte[]> getLogo(
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        Optional<CompanyLogoAsset> logoOpt = companyProfileService.getCurrentLogo();
        if (logoOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        CompanyLogoAsset logo = logoOpt.get();
        String etag = logo.etag();

        if (etagMatches(ifNoneMatch, etag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                    .eTag(etag)
                    .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                    .build();
        }

        ResponseEntity.BodyBuilder builder = ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(logo.contentType()))
                .eTag(etag)
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff");

        if ("image/svg+xml".equalsIgnoreCase(logo.contentType())) {
            builder.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
        }

        return builder.body(logo.data());
    }

    static boolean etagMatches(String ifNoneMatch, String currentEtag) {
        if (ifNoneMatch == null || ifNoneMatch.isBlank() || currentEtag == null) {
            return false;
        }
        String trimmed = ifNoneMatch.trim();
        if ("*".equals(trimmed)) {
            return true;
        }
        String normalizedCurrent = stripWeakPrefix(currentEtag);
        for (String candidate : trimmed.split(",")) {
            if (normalizedCurrent.equals(stripWeakPrefix(candidate.trim()))) {
                return true;
            }
        }
        return false;
    }

    private static String stripWeakPrefix(String etag) {
        if (etag.startsWith("W/") || etag.startsWith("w/")) {
            return etag.substring(2).trim();
        }
        return etag;
    }
}
