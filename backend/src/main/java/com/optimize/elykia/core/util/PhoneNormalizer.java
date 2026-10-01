package com.optimize.elykia.core.util;

import com.optimize.common.entities.exception.CustomValidationException;
import org.springframework.util.StringUtils;

import java.util.regex.Pattern;

/**
 * Normalise les numéros de téléphone Togo (+228) pour l'espace client.
 * Username / stockage : numéro local sans indicatif.
 * Notification Hub OTP : format E.164 (+228XXXXXXXX).
 */
public final class PhoneNormalizer {

    public static final String COUNTRY_CODE = "228";

    public static final String INVALID_TOGO_PHONE_MESSAGE = "Veuillez saisir un numéro togolais valide.";

    /** Mobile Togo : 8 chiffres, préfixes 90-93, 96-99, 70, 71, 78, 79. */
    private static final Pattern TOGO_MOBILE_PATTERN = Pattern.compile("^(70|71|78|79|9[0-3]|9[6-9])\\d{6}$");

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

    public static boolean isValidTogoMobile(String raw) {
        return TOGO_MOBILE_PATTERN.matcher(toUsername(raw)).matches();
    }

    /** Retourne le numéro local normalisé, ou lève une erreur si ce n'est pas un mobile togolais. */
    public static String requireTogoMobile(String raw) {
        String username = toUsername(raw);
        if (!TOGO_MOBILE_PATTERN.matcher(username).matches()) {
            throw new CustomValidationException(INVALID_TOGO_PHONE_MESSAGE);
        }
        return username;
    }
}
