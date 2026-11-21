package com.optimize.elykia.shared.security;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import org.springframework.util.StringUtils;

/**
 * Règles transverses d'audience et d'appartenance portefeuille (crédit / tontine)
 * pour les profils staff ({@code SECRETARY}, {@code GESTIONNAIRE}, {@code ADMIN})
 * et commerciaux ({@code PROMOTER}).
 */
public final class CollectorAudienceSecurity {

    private CollectorAudienceSecurity() {
    }

    public static boolean isNotificationAudience(User user) {
        if (user == null || !StringUtils.hasText(user.getUsername())) {
            return false;
        }
        return user.is(UserProfilConstant.SECRETARY)
                || user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.PROMOTER);
    }

    public static void assertAudienceOrThrow(User user) {
        if (!isNotificationAudience(user)) {
            throw new CustomValidationException(
                    "Accès réservé au secrétaire, gestionnaire, admin et commercial.");
        }
    }

    public static boolean isStaffAllAccess(User user) {
        return user != null && (user.is(UserProfilConstant.SECRETARY)
                || user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN));
    }

    public static boolean isPromoterOnly(User user) {
        return user != null
                && user.is(UserProfilConstant.PROMOTER)
                && !isStaffAllAccess(user);
    }

    /** Credit recovery / order portfolio: match {@code collector} only (not tontineCollector). */
    public static boolean matchesCreditCollector(User user, String collector) {
        if (user == null || !StringUtils.hasText(user.getUsername())) {
            return false;
        }
        return user.getUsername().equalsIgnoreCase(nullToEmpty(collector));
    }

    /** Tontine collection portfolio: match {@code tontineCollector} only (not credit collector). */
    public static boolean matchesTontineCollector(User user, String tontineCollector) {
        if (user == null || !StringUtils.hasText(user.getUsername())) {
            return false;
        }
        return user.getUsername().equalsIgnoreCase(nullToEmpty(tontineCollector));
    }

    /**
     * PROMOTER-only: refuse credit recovery if the credit collector is not the current user.
     * Staff and other profiles are not restricted.
     */
    public static void assertPromoterOwnsCreditCollector(User user, String collector) {
        if (!isPromoterOnly(user)) {
            return;
        }
        if (!matchesCreditCollector(user, collector)) {
            throw new CustomValidationException(
                    "Ce client ne vous est pas affecté en tant que commercial crédit. Vous ne pouvez pas enregistrer ce recouvrement.");
        }
    }

    /**
     * PROMOTER-only: refuse tontine collection if the client's tontine collector is not the current user.
     * Staff and other profiles are not restricted.
     */
    public static void assertPromoterOwnsTontineCollector(User user, String tontineCollector) {
        if (!isPromoterOnly(user)) {
            return;
        }
        if (!matchesTontineCollector(user, tontineCollector)) {
            throw new CustomValidationException(
                    "Ce client ne vous est pas affecté en tant que commercial tontine. Vous ne pouvez pas enregistrer cette collecte.");
        }
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}
