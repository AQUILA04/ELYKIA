package com.optimize.elykia.company.application;

import com.optimize.elykia.company.domain.CompanyLogoAsset;
import com.optimize.elykia.company.domain.CompanyProfile;
import com.optimize.elykia.company.web.dto.CompanyProfileDto;
import com.optimize.elykia.shared.pdf.PdfBrandProfile;
import com.optimize.elykia.shared.pdf.PdfBrandProfileProvider;
import com.optimize.elykia.shared.pdf.PdfDocumentIdentity;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Base64;
import java.util.Locale;
import java.util.Set;

/**
 * Bridges the Caffeine-cached {@link CompanyProfileService} into {@link PdfDocumentIdentity}
 * so every Thymeleaf + iText PDF export automatically uses the deployed enterprise name,
 * contact details, color chart, and logo (PNG/JPEG/SVG).
 */
@Component
@RequiredArgsConstructor
public class CompanyPdfBrandProfileProvider implements PdfBrandProfileProvider {

    /** Formats natively decoded by iText html2pdf data URIs (WebP falls back gracefully to monogram). */
    private static final Set<String> ITEXT_SUPPORTED_LOGO_MIMES = Set.of(
            "image/png",
            "image/jpeg",
            "image/svg+xml"
    );

    private final CompanyProfileService companyProfileService;

    @PostConstruct
    void register() {
        PdfDocumentIdentity.registerProvider(this);
    }

    @PreDestroy
    void unregister() {
        PdfDocumentIdentity.resetProvider();
    }

    @Override
    public PdfBrandProfile currentBrand() {
        CompanyProfileDto dto = companyProfileService.getCurrentProfile();
        boolean isDefaultCompany = CompanyProfile.DEFAULT_COMPANY_NAME.equalsIgnoreCase(dto.companyName());

        String address = hasText(dto.address())
                ? dto.address().trim()
                : (isDefaultCompany ? PdfDocumentIdentity.COMPANY_ADDRESS : null);

        String phone = hasText(dto.phone())
                ? dto.phone().trim()
                : (isDefaultCompany ? PdfDocumentIdentity.COMPANY_PHONE : null);

        String phoneDisplay = PdfBrandProfile.formatPhoneDisplay(phone);

        String logoDataUri = dto.hasLogo()
                ? companyProfileService.getCurrentLogo()
                        .map(CompanyPdfBrandProfileProvider::toDataUriIfSupported)
                        .orElse(null)
                : null;

        return new PdfBrandProfile(
                dto.companyName(),
                dto.shortName(),
                dto.tagline(),
                address,
                phone,
                phoneDisplay,
                dto.email(),
                dto.website(),
                dto.taxId(),
                dto.primaryColor(),
                dto.secondaryColor(),
                dto.accentColor(),
                logoDataUri,
                PdfBrandProfile.computeInitial(dto.companyName()),
                dto.themeVersion()
        );
    }

    static String toDataUriIfSupported(CompanyLogoAsset asset) {
        if (asset == null || asset.contentType() == null) {
            return null;
        }
        String mime = asset.contentType().trim().toLowerCase(Locale.ROOT);
        if (!ITEXT_SUPPORTED_LOGO_MIMES.contains(mime)) {
            return null;
        }
        byte[] bytes = asset.data();
        if (bytes.length == 0) {
            return null;
        }
        return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(bytes);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
