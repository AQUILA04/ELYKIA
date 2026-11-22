package com.optimize.elykia.company.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.company.domain.CompanyLogoAsset;
import com.optimize.elykia.company.domain.CompanyProfile;
import com.optimize.elykia.company.infrastructure.persistence.CompanyProfileRepository;
import com.optimize.elykia.company.web.dto.CompanyProfileDto;
import com.optimize.elykia.company.web.dto.CompanyProfileUpdateDto;
import com.optimize.elykia.shared.cache.CacheNames;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyProfileService {

    public static final long MAX_LOGO_BYTES = 2L * 1024 * 1024; // 2 MB

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/svg+xml"
    );

    private static final Pattern UNSAFE_SVG_PATTERN = Pattern.compile(
            "<\\s*script\\b|<\\s*foreignObject\\b|<\\s*iframe\\b|javascript\\s*:|vbscript\\s*:|\\bon[a-z]+\\s*=",
            Pattern.CASE_INSENSITIVE
    );

    private final CompanyProfileRepository repository;

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.COMPANY_PROFILE, key = "'current'")
    public CompanyProfileDto getCurrentProfile() {
        CompanyProfile profile = repository.findById(CompanyProfile.SINGLETON_ID)
                .orElseGet(CompanyProfile::createDefault);
        return CompanyProfileDto.fromEntity(profile);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.COMPANY_LOGO, key = "'current'")
    public Optional<CompanyLogoAsset> getCurrentLogo() {
        return repository.findById(CompanyProfile.SINGLETON_ID)
                .filter(CompanyProfile::hasLogo)
                .map(profile -> new CompanyLogoAsset(
                        profile.getLogoData(),
                        profile.getLogoContentType(),
                        profile.getLogoFilename(),
                        profile.getThemeVersion() != null ? profile.getThemeVersion() : 1L
                ));
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheNames.COMPANY_PROFILE, allEntries = true),
            @CacheEvict(value = CacheNames.COMPANY_LOGO, allEntries = true)
    })
    public CompanyProfileDto updateProfile(CompanyProfileUpdateDto dto, String actor) {
        CompanyProfile profile = getOrCreateForUpdate();

        profile.setCompanyName(dto.companyName().trim());
        profile.setShortName(trimToNull(dto.shortName()));
        profile.setTagline(trimToNull(dto.tagline()));
        profile.setAddress(trimToNull(dto.address()));
        profile.setPhone(trimToNull(dto.phone()));
        profile.setEmail(trimToNull(dto.email()));
        profile.setWebsite(trimToNull(dto.website()));
        profile.setTaxId(trimToNull(dto.taxId()));

        profile.setPrimaryColor(normalizeHex(dto.primaryColor()));
        profile.setSecondaryColor(normalizeHex(dto.secondaryColor()));
        profile.setAccentColor(normalizeHex(dto.accentColor()));
        profile.setSidebarBgColor(normalizeHex(dto.sidebarBgColor()));
        profile.setSidebarTextColor(normalizeHex(dto.sidebarTextColor()));
        profile.setBackgroundColor(normalizeHex(dto.backgroundColor()));

        profile.bumpVersion(actor);
        CompanyProfile saved = repository.save(profile);
        log.info("Company profile updated to themeVersion={} by {}", saved.getThemeVersion(), saved.getUpdatedBy());
        return CompanyProfileDto.fromEntity(saved);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheNames.COMPANY_PROFILE, allEntries = true),
            @CacheEvict(value = CacheNames.COMPANY_LOGO, allEntries = true)
    })
    public CompanyProfileDto uploadLogo(MultipartFile file, String actor) {
        if (file == null || file.isEmpty()) {
            throw new CustomValidationException("Veuillez sélectionner un fichier logo valide.");
        }
        if (file.getSize() > MAX_LOGO_BYTES) {
            throw new CustomValidationException("Le logo dépasse la taille maximale autorisée de 2 Mo.");
        }

        String contentType = normalizeContentType(file.getContentType());
        if (!ALLOWED_MIME_TYPES.contains(contentType)) {
            throw new CustomValidationException(
                    "Format de logo non supporté. Formats autorisés : PNG, JPEG, WEBP, SVG.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new CustomValidationException("Impossible de lire le fichier logo téléversé.");
        }

        if (bytes.length == 0 || bytes.length > MAX_LOGO_BYTES) {
            throw new CustomValidationException("Le fichier logo est vide ou dépasse 2 Mo.");
        }

        validateLogoContent(bytes, contentType);

        CompanyProfile profile = getOrCreateForUpdate();
        profile.setLogoData(bytes);
        profile.setLogoContentType(contentType);
        profile.setLogoFilename(sanitizeFilename(file.getOriginalFilename(), contentType));
        profile.bumpVersion(actor);

        CompanyProfile saved = repository.save(profile);
        log.info("Company logo uploaded ({}, {} bytes) -> themeVersion={} by {}",
                contentType, bytes.length, saved.getThemeVersion(), saved.getUpdatedBy());
        return CompanyProfileDto.fromEntity(saved);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheNames.COMPANY_PROFILE, allEntries = true),
            @CacheEvict(value = CacheNames.COMPANY_LOGO, allEntries = true)
    })
    public CompanyProfileDto deleteLogo(String actor) {
        CompanyProfile profile = getOrCreateForUpdate();
        profile.setLogoData(null);
        profile.setLogoContentType(null);
        profile.setLogoFilename(null);
        profile.bumpVersion(actor);

        CompanyProfile saved = repository.save(profile);
        log.info("Company logo removed -> themeVersion={} by {}", saved.getThemeVersion(), saved.getUpdatedBy());
        return CompanyProfileDto.fromEntity(saved);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheNames.COMPANY_PROFILE, allEntries = true),
            @CacheEvict(value = CacheNames.COMPANY_LOGO, allEntries = true)
    })
    public CompanyProfileDto resetThemeToDefaults(String actor) {
        CompanyProfile profile = getOrCreateForUpdate();
        profile.resetColorsToDefaults();
        profile.bumpVersion(actor);

        CompanyProfile saved = repository.save(profile);
        log.info("Company color chart reset to ELYKIA defaults -> themeVersion={} by {}",
                saved.getThemeVersion(), saved.getUpdatedBy());
        return CompanyProfileDto.fromEntity(saved);
    }

    private CompanyProfile getOrCreateForUpdate() {
        return repository.findById(CompanyProfile.SINGLETON_ID)
                .orElseGet(CompanyProfile::createDefault);
    }

    private static String normalizeHex(String hex) {
        return hex.trim().toLowerCase(Locale.ROOT);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }
        String base = contentType.split(";")[0].trim().toLowerCase(Locale.ROOT);
        if ("image/jpg".equals(base)) {
            return "image/jpeg";
        }
        return base;
    }

    private static void validateLogoContent(byte[] bytes, String contentType) {
        switch (contentType) {
            case "image/png" -> {
                if (bytes.length < 8
                        || (bytes[0] & 0xFF) != 0x89
                        || bytes[1] != 0x50
                        || bytes[2] != 0x4E
                        || bytes[3] != 0x47
                        || bytes[4] != 0x0D
                        || bytes[5] != 0x0A
                        || bytes[6] != 0x1A
                        || bytes[7] != 0x0A) {
                    throw new CustomValidationException("Le contenu du fichier ne correspond pas à une image PNG valide.");
                }
            }
            case "image/jpeg" -> {
                if (bytes.length < 3
                        || (bytes[0] & 0xFF) != 0xFF
                        || (bytes[1] & 0xFF) != 0xD8
                        || (bytes[2] & 0xFF) != 0xFF) {
                    throw new CustomValidationException("Le contenu du fichier ne correspond pas à une image JPEG valide.");
                }
            }
            case "image/webp" -> {
                if (bytes.length < 12
                        || bytes[0] != 'R' || bytes[1] != 'I' || bytes[2] != 'F' || bytes[3] != 'F'
                        || bytes[8] != 'W' || bytes[9] != 'E' || bytes[10] != 'B' || bytes[11] != 'P') {
                    throw new CustomValidationException("Le contenu du fichier ne correspond pas à une image WEBP valide.");
                }
            }
            case "image/svg+xml" -> {
                String svgText = new String(bytes, StandardCharsets.UTF_8);
                if (!svgText.toLowerCase(Locale.ROOT).contains("<svg")) {
                    throw new CustomValidationException("Le fichier SVG est invalide (balise <svg> manquante).");
                }
                if (UNSAFE_SVG_PATTERN.matcher(svgText).find()) {
                    throw new CustomValidationException(
                            "Le fichier SVG contient des éléments actifs non autorisés (script ou gestionnaire d'événement).");
                }
            }
            default -> throw new CustomValidationException("Format de logo non supporté.");
        }
    }

    private static String sanitizeFilename(String originalFilename, String contentType) {
        String ext = switch (contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            case "image/svg+xml" -> ".svg";
            default -> "";
        };
        if (originalFilename == null || originalFilename.isBlank()) {
            return "company-logo" + ext;
        }
        String baseName = originalFilename.replace('\\', '/');
        int slash = baseName.lastIndexOf('/');
        if (slash >= 0) {
            baseName = baseName.substring(slash + 1);
        }
        baseName = baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (baseName.length() > 200) {
            baseName = baseName.substring(baseName.length() - 200);
        }
        return baseName.isBlank() ? "company-logo" + ext : baseName;
    }
}
