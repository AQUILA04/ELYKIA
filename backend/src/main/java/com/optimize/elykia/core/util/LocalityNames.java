package com.optimize.elykia.core.util;

/**
 * Libellé sentinelle et normalisation des noms de localité saisis à l'inscription.
 */
public final class LocalityNames {

    public static final String OTHER_LABEL = "AUTRES (à préciser)";
    public static final int MAX_LENGTH = 100;

    private LocalityNames() {
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().replaceAll("\\s+", " ");
    }

    public static boolean isOtherLabel(String raw) {
        return OTHER_LABEL.equalsIgnoreCase(normalize(raw));
    }
}
