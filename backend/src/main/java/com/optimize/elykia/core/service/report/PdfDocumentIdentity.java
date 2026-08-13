package com.optimize.elykia.core.service.report;

import org.thymeleaf.context.Context;

/**
 * Identité visuelle commune des PDF Elykia (thème navy).
 * Tous les nouveaux exports doivent passer par {@link #applyTo(Context, String)}.
 */
public final class PdfDocumentIdentity {

    public static final String COMPANY_NAME = "AMENOUVEVE-YAVEH";
    public static final String COMPANY_ADDRESS = "TOKOIN HÔPITAL";
    public static final String COMPANY_PHONE = "96186822";
    public static final String COMPANY_PHONE_DISPLAY = "96 18 68 22";
    public static final String PRIMARY_COLOR_HEX = "#003366";

    private PdfDocumentIdentity() {
    }

    public static void applyTo(Context context, String documentTitle) {
        context.setVariable("pdfCompanyName", COMPANY_NAME);
        context.setVariable("pdfCompanyAddress", COMPANY_ADDRESS);
        context.setVariable("pdfCompanyPhone", COMPANY_PHONE);
        context.setVariable("pdfCompanyPhoneDisplay", COMPANY_PHONE_DISPLAY);
        context.setVariable("pdfDocumentTitle", documentTitle);
        context.setVariable("pdfPrimaryColor", PRIMARY_COLOR_HEX);
    }

    public static String footerLabel(String documentTitle) {
        return COMPANY_NAME + "  |  " + documentTitle;
    }
}
