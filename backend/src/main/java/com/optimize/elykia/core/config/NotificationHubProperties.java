package com.optimize.elykia.core.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Client Notification Hub (OTP SMS) — contrat aligné sur
 * {@code optimize.notification.hub.*} / OTP_CLIENT_INTEGRATION.md.
 */
@ConfigurationProperties(prefix = "optimize.notification.hub")
@Getter
@Setter
public class NotificationHubProperties {

    /** Active les appels OTP vers le hub. */
    private boolean enabled = false;

    private String baseUrl = "http://localhost:8088";

    /** Header X-Tenant-Id (profil local hub / sans OAuth2). */
    private String tenantId = "elykia";

    /** Header X-App-Id optionnel pour l'audit hub. */
    private String appId = "elykia-customer-space";

    /**
     * Environnement SMS du hub : {@code test} (email recette) ou {@code prod} (SMS réel).
     * Vide = dérivé du profil Spring ({@code prod}/{@code production} → prod).
     */
    private String environment;

    private int connectTimeoutMs = 5_000;
    private int readTimeoutMs = 30_000;

    /** Durée de validité du jeton de preuve OTP après verify réussi (minutes). */
    private int proofTtlMinutes = 10;

    /**
     * Secret HMAC pour le jeton de preuve setup-pin.
     * Défaut : dérivé de la clé JWT si non renseigné.
     */
    private String proofSecret;

    private OAuth2 oauth2 = new OAuth2();

    @Getter
    @Setter
    public static class OAuth2 {
        /** Client credentials Keycloak (prod). Désactiver en local. */
        private boolean enabled = false;
        private String tokenUri;
        private String clientId;
        private String clientSecret;
        private int refreshSkewSeconds = 30;
    }
}
