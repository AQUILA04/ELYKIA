package com.optimize.elykia.company.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "company_profile")
@Getter
@Setter
@NoArgsConstructor
public class CompanyProfile {

    public static final Long SINGLETON_ID = 1L;

    public static final String DEFAULT_COMPANY_NAME = "AMENOUVEVE-YAVEH";
    public static final String DEFAULT_SHORT_NAME = "ELYKIA";
    public static final String DEFAULT_TAGLINE = "Gestion Elykia";
    public static final String DEFAULT_PRIMARY_COLOR = "#003366";
    public static final String DEFAULT_SECONDARY_COLOR = "#0095c8";
    public static final String DEFAULT_ACCENT_COLOR = "#00c2a8";
    public static final String DEFAULT_SIDEBAR_BG_COLOR = "#ffffff";
    public static final String DEFAULT_SIDEBAR_TEXT_COLOR = "#1e293b";
    public static final String DEFAULT_BACKGROUND_COLOR = "#f2f4f8";

    @Id
    private Long id = SINGLETON_ID;

    @Column(name = "company_name", nullable = false, length = 150)
    private String companyName = DEFAULT_COMPANY_NAME;

    @Column(name = "short_name", length = 60)
    private String shortName = DEFAULT_SHORT_NAME;

    @Column(name = "tagline", length = 180)
    private String tagline = DEFAULT_TAGLINE;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "website", length = 255)
    private String website;

    @Column(name = "tax_id", length = 80)
    private String taxId;

    @Column(name = "primary_color", nullable = false, length = 7)
    private String primaryColor = DEFAULT_PRIMARY_COLOR;

    @Column(name = "secondary_color", nullable = false, length = 7)
    private String secondaryColor = DEFAULT_SECONDARY_COLOR;

    @Column(name = "accent_color", nullable = false, length = 7)
    private String accentColor = DEFAULT_ACCENT_COLOR;

    @Column(name = "sidebar_bg_color", nullable = false, length = 7)
    private String sidebarBgColor = DEFAULT_SIDEBAR_BG_COLOR;

    @Column(name = "sidebar_text_color", nullable = false, length = 7)
    private String sidebarTextColor = DEFAULT_SIDEBAR_TEXT_COLOR;

    @Column(name = "background_color", nullable = false, length = 7)
    private String backgroundColor = DEFAULT_BACKGROUND_COLOR;

    @Column(name = "logo_data", columnDefinition = "BYTEA")
    private byte[] logoData;

    @Column(name = "logo_content_type", length = 80)
    private String logoContentType;

    @Column(name = "logo_filename", length = 255)
    private String logoFilename;

    @Column(name = "theme_version", nullable = false)
    private Long themeVersion = 1L;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    public static CompanyProfile createDefault() {
        CompanyProfile profile = new CompanyProfile();
        profile.setId(SINGLETON_ID);
        profile.setCompanyName(DEFAULT_COMPANY_NAME);
        profile.setShortName(DEFAULT_SHORT_NAME);
        profile.setTagline(DEFAULT_TAGLINE);
        profile.resetColorsToDefaults();
        profile.setThemeVersion(1L);
        profile.setUpdatedAt(LocalDateTime.now());
        profile.setUpdatedBy("system");
        return profile;
    }

    public boolean hasLogo() {
        return logoData != null && logoData.length > 0 && logoContentType != null && !logoContentType.isBlank();
    }

    public void resetColorsToDefaults() {
        this.primaryColor = DEFAULT_PRIMARY_COLOR;
        this.secondaryColor = DEFAULT_SECONDARY_COLOR;
        this.accentColor = DEFAULT_ACCENT_COLOR;
        this.sidebarBgColor = DEFAULT_SIDEBAR_BG_COLOR;
        this.sidebarTextColor = DEFAULT_SIDEBAR_TEXT_COLOR;
        this.backgroundColor = DEFAULT_BACKGROUND_COLOR;
    }

    public void bumpVersion(String actor) {
        this.themeVersion = (this.themeVersion == null ? 0L : this.themeVersion) + 1L;
        this.updatedAt = LocalDateTime.now();
        this.updatedBy = (actor == null || actor.isBlank()) ? "system" : actor;
    }
}
