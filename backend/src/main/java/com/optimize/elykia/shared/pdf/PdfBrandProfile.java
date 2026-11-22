package com.optimize.elykia.shared.pdf;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Immutable branding snapshot injected into Thymeleaf PDF templates and the iText footer renderer.
 */
public record PdfBrandProfile(
        String companyName,
        String shortName,
        String tagline,
        String address,
        String phone,
        String phoneDisplay,
        String email,
        String website,
        String taxId,
        String primaryColorHex,
        String secondaryColorHex,
        String accentColorHex,
        String logoDataUri,
        String brandInitial,
        long themeVersion
) {
    private static final Pattern HEX_PATTERN = Pattern.compile("^#[0-9a-fA-F]{6}$");

    public static PdfBrandProfile defaults() {
        return new PdfBrandProfile(
                PdfDocumentIdentity.COMPANY_NAME,
                "ELYKIA",
                "Gestion Elykia",
                PdfDocumentIdentity.COMPANY_ADDRESS,
                PdfDocumentIdentity.COMPANY_PHONE,
                PdfDocumentIdentity.COMPANY_PHONE_DISPLAY,
                null,
                null,
                null,
                PdfDocumentIdentity.PRIMARY_COLOR_HEX,
                "#0095c8",
                "#00c2a8",
                null,
                "A",
                1L
        );
    }

    public String safePrimaryHex() {
        return normalizeHex(primaryColorHex, PdfDocumentIdentity.PRIMARY_COLOR_HEX);
    }

    public String safeSecondaryHex() {
        return normalizeHex(secondaryColorHex, "#0095c8");
    }

    public String safeAccentHex() {
        return normalizeHex(accentColorHex, "#00c2a8");
    }

    public String primaryMidHex() {
        return mixWithWhite(safePrimaryHex(), 0.16);
    }

    public String primaryLightHex() {
        return mixWithWhite(safePrimaryHex(), 0.38);
    }

    public String primaryPaleHex() {
        return mixWithWhite(safePrimaryHex(), 0.88);
    }

    public String primaryXpaleHex() {
        return mixWithWhite(safePrimaryHex(), 0.93);
    }

    public int[] primaryRgb() {
        return parseRgb(safePrimaryHex());
    }

    public int[] primaryXpaleRgb() {
        return parseRgb(primaryXpaleHex());
    }

    public boolean isPrimaryDark() {
        int[] rgb = primaryRgb();
        double luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255.0;
        return luminance < 0.55;
    }

    public static String computeInitial(String name) {
        if (name != null) {
            String trimmed = name.trim();
            for (int i = 0; i < trimmed.length(); i++) {
                char c = trimmed.charAt(i);
                if (Character.isLetterOrDigit(c)) {
                    return String.valueOf(Character.toUpperCase(c));
                }
            }
        }
        return "E";
    }

    public static String formatPhoneDisplay(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String trimmed = phone.trim();
        if (trimmed.matches("^\\d{8}$")) {
            return trimmed.substring(0, 2) + " "
                    + trimmed.substring(2, 4) + " "
                    + trimmed.substring(4, 6) + " "
                    + trimmed.substring(6, 8);
        }
        return trimmed;
    }

    private static String normalizeHex(String candidate, String fallback) {
        if (candidate != null && HEX_PATTERN.matcher(candidate.trim()).matches()) {
            return candidate.trim().toLowerCase(Locale.ROOT);
        }
        return fallback.toLowerCase(Locale.ROOT);
    }

    private static int[] parseRgb(String hex) {
        String clean = hex.startsWith("#") ? hex.substring(1) : hex;
        return new int[]{
                Integer.parseInt(clean.substring(0, 2), 16),
                Integer.parseInt(clean.substring(2, 4), 16),
                Integer.parseInt(clean.substring(4, 6), 16)
        };
    }

    private static String mixWithWhite(String hex, double whiteWeight) {
        int[] rgb = parseRgb(hex);
        double w = Math.max(0.0, Math.min(1.0, whiteWeight));
        int r = (int) Math.round(rgb[0] * (1.0 - w) + 255.0 * w);
        int g = (int) Math.round(rgb[1] * (1.0 - w) + 255.0 * w);
        int b = (int) Math.round(rgb[2] * (1.0 - w) + 255.0 * w);
        return String.format(Locale.ROOT, "#%02x%02x%02x", clamp(r), clamp(g), clamp(b));
    }

    private static int clamp(int value) {
        return Math.max(0, Math.min(255, value));
    }
}
