package com.optimize.elykia.company.web.dto;

import com.optimize.elykia.company.domain.CompanyProfile;

import java.time.LocalDateTime;

public record CompanyProfileDto(
        String companyName,
        String shortName,
        String tagline,
        String address,
        String phone,
        String email,
        String website,
        String taxId,
        String primaryColor,
        String secondaryColor,
        String accentColor,
        String sidebarBgColor,
        String sidebarTextColor,
        String backgroundColor,
        boolean hasLogo,
        String logoFilename,
        String logoUrl,
        long themeVersion,
        LocalDateTime updatedAt,
        String updatedBy
) {
    public static CompanyProfileDto fromEntity(CompanyProfile entity) {
        long version = entity.getThemeVersion() != null ? entity.getThemeVersion() : 1L;
        boolean hasLogo = entity.hasLogo();
        String logoUrl = hasLogo ? "/api/public/company/logo?v=" + version : null;
        return new CompanyProfileDto(
                entity.getCompanyName(),
                entity.getShortName(),
                entity.getTagline(),
                entity.getAddress(),
                entity.getPhone(),
                entity.getEmail(),
                entity.getWebsite(),
                entity.getTaxId(),
                entity.getPrimaryColor(),
                entity.getSecondaryColor(),
                entity.getAccentColor(),
                entity.getSidebarBgColor(),
                entity.getSidebarTextColor(),
                entity.getBackgroundColor(),
                hasLogo,
                hasLogo ? entity.getLogoFilename() : null,
                logoUrl,
                version,
                entity.getUpdatedAt(),
                entity.getUpdatedBy()
        );
    }

    public String etag() {
        return "\"company-v" + themeVersion + "\"";
    }
}
