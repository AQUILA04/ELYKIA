package com.optimize.elykia.core.util;

import org.springframework.util.StringUtils;

/**
 * Normalise les numéros de téléphone Togo (+228) pour l'espace client.
 * Username / stockage : numéro local sans indicatif.
 * Firebase : format E.164 (+228XXXXXXXX).
 */
public final class PhoneNormalizer {

    public static final String COUNTRY_CODE = "228";

    private PhoneNormalizer() {
    }

    public static String toUsername(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.startsWith(COUNTRY_CODE) && digits.length() > COUNTRY_CODE.length()) {
            digits = digits.substring(COUNTRY_CODE.length());
        }
        while (digits.startsWith("0") && digits.length() > 1) {
            digits = digits.substring(1);
        }
        return digits;
    }

    public static String toE164(String username) {
        String local = toUsername(username);
        if (!StringUtils.hasText(local)) {
            return "";
        }
        return "+" + COUNTRY_CODE + local;
    }

    public static boolean matches(String rawPhone, String storedUsername) {
        return toUsername(rawPhone).equals(toUsername(storedUsername));
    }
}
