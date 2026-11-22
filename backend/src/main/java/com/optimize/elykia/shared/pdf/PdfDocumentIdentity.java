package com.optimize.elykia.shared.pdf;

import org.thymeleaf.context.Context;

import java.util.concurrent.atomic.AtomicReference;

/**
 * Identité visuelle commune des PDF Elykia.
 * Utilise dynamiquement le profil entreprise configuré (via {@link PdfBrandProfileProvider})
 * avec repli automatique sur les constantes par défaut ELYKIA.
 */
public final class PdfDocumentIdentity {

    public static final String COMPANY_NAME = "AMENOUVEVE-YAVEH";
    public static final String COMPANY_ADDRESS = "TOKOIN HÔPITAL";
    public static final String COMPANY_PHONE = "96186822";
    public static final String COMPANY_PHONE_DISPLAY = "96 18 68 22";
    public static final String PRIMARY_COLOR_HEX = "#003366";

    private static final AtomicReference<PdfBrandProfileProvider> PROVIDER = new AtomicReference<>();

    private PdfDocumentIdentity() {
    }

    public static void registerProvider(PdfBrandProfileProvider provider) {
        PROVIDER.set(provider);
    }

    public static void resetProvider() {
        PROVIDER.set(null);
    }

    public static PdfBrandProfile current() {
        PdfBrandProfileProvider provider = PROVIDER.get();
        if (provider == null) {
            return PdfBrandProfile.defaults();
        }
        try {
            PdfBrandProfile resolved = provider.currentBrand();
            return resolved != null ? resolved : PdfBrandProfile.defaults();
        } catch (RuntimeException ex) {
            return PdfBrandProfile.defaults();
        }
    }

    public static void applyTo(Context context, String documentTitle) {
        applyTo(context, documentTitle, current());
    }

    public static void applyTo(Context context, String documentTitle, PdfBrandProfile brand) {
        PdfBrandProfile effective = brand != null ? brand : PdfBrandProfile.defaults();
        context.setVariable("pdfCompanyName", effective.companyName());
        context.setVariable("pdfCompanyShortName", effective.shortName());
        context.setVariable("pdfCompanyTagline", effective.tagline());
        context.setVariable("pdfCompanyAddress", effective.address());
        context.setVariable("pdfCompanyPhone", effective.phone());
        context.setVariable("pdfCompanyPhoneDisplay", effective.phoneDisplay());
        context.setVariable("pdfCompanyEmail", effective.email());
        context.setVariable("pdfCompanyWebsite", effective.website());
        context.setVariable("pdfCompanyTaxId", effective.taxId());
        context.setVariable("pdfCompanyLogoDataUri", effective.logoDataUri());
        context.setVariable("pdfCompanyInitial", effective.brandInitial());
        context.setVariable("pdfDocumentTitle", documentTitle);
        context.setVariable("pdfPrimaryColor", effective.safePrimaryHex());
        context.setVariable("pdfPrimaryMidColor", effective.primaryMidHex());
        context.setVariable("pdfPrimaryLightColor", effective.primaryLightHex());
        context.setVariable("pdfPrimaryPaleColor", effective.primaryPaleHex());
        context.setVariable("pdfPrimaryXpaleColor", effective.primaryXpaleHex());
        context.setVariable("pdfSecondaryColor", effective.safeSecondaryHex());
        context.setVariable("pdfAccentColor", effective.safeAccentHex());
    }

    public static String footerLabel(String documentTitle) {
        return current().companyName() + "  |  " + documentTitle;
    }
}
