package com.optimize.elykia.core.config;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Masque les champs sensibles d'un corps de requête avant écriture dans les logs.
 */
public final class RequestPayloadSanitizer {

    private static final String SECRET_KEY = "(?:password|passwd|secret|token|authorization|otp|pin)";

    private static final Pattern JSON_SECRET = Pattern.compile(
            "(\"(?i)[^\"]*" + SECRET_KEY + "[^\"]*\"\\s*:\\s*\")(?:\\\\.|[^\"\\\\])*(\")");

    private static final Pattern FORM_SECRET = Pattern.compile(
            "(?i)((?:^|[&])[^=&]*" + SECRET_KEY + "[^=&]*=)[^&]*");

    private RequestPayloadSanitizer() {
    }

    public static String mask(String payload) {
        if (payload == null || payload.isEmpty()) {
            return payload;
        }
        String masked = JSON_SECRET.matcher(payload).replaceAll("$1***$2");
        return FORM_SECRET.matcher(masked).replaceAll("$1***");
    }

    public static boolean isAuthPath(String uri) {
        if (uri == null || uri.isEmpty()) {
            return false;
        }
        String path = uri.toLowerCase(Locale.ROOT);
        return path.contains("/api/auth/")
                || path.endsWith("/api/auth")
                || path.contains("/auth/signin")
                || path.contains("/auth/signup")
                || path.contains("/auth/refreshtoken");
    }
}
