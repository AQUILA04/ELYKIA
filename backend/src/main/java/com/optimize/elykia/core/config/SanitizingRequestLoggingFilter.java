package com.optimize.elykia.core.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.filter.CommonsRequestLoggingFilter;

/**
 * Journalise les requêtes sans écrire les mots de passe ni les jetons.
 * Le corps des appels {@code /api/auth/**} est omis en entier.
 */
public class SanitizingRequestLoggingFilter extends CommonsRequestLoggingFilter {

    static final String OMITTED_BODY = "[corps omis]";

    @Override
    protected String getMessagePayload(HttpServletRequest request) {
        if (RequestPayloadSanitizer.isAuthPath(request.getRequestURI())) {
            return OMITTED_BODY;
        }
        return RequestPayloadSanitizer.mask(super.getMessagePayload(request));
    }
}
