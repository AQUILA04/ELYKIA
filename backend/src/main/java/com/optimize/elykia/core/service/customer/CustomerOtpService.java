package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.config.NotificationHubProperties;
import com.optimize.elykia.core.notificationhub.NotificationHubClientException;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpClient;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpSendRequest;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpSendResponse;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpVerifyRequest;
import com.optimize.elykia.core.notificationhub.NotificationHubOtpModels.OtpVerifyResponse;
import com.optimize.elykia.core.util.PhoneNormalizer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

/**
 * OTP espace client via Notification Hub (envoi SMS + vérification).
 * Après un verify réussi, émet un jeton de preuve HMAC consommé par {@code setup-pin}.
 */
@Service
@Slf4j
public class CustomerOtpService {

    private final ObjectProvider<NotificationHubOtpClient> otpClient;
    private final NotificationHubProperties hubProperties;

    @Value("${bezkoder.app.jwtSecret:elykia-dev-secret}")
    private String jwtSecret;

    public CustomerOtpService(
            ObjectProvider<NotificationHubOtpClient> otpClient,
            NotificationHubProperties hubProperties) {
        this.otpClient = otpClient;
        this.hubProperties = hubProperties;
    }

    public OtpSendResponse sendOtp(String phone) {
        requireEnabled();
        String username = PhoneNormalizer.toUsername(phone);
        String e164 = PhoneNormalizer.toE164(username);
        if (!StringUtils.hasText(e164)) {
            throw new CustomValidationException("Numéro de téléphone invalide.");
        }
        try {
            String idempotencyKey = UUID.randomUUID().toString();
            OtpSendResponse response = client().sendOtp(OtpSendRequest.sms(e164, null), idempotencyKey);
            log.info("OTP envoyé via Notification Hub pour {} (session={})", username, response.sessionId());
            return response;
        } catch (NotificationHubClientException ex) {
            throw mapSendError(ex);
        }
    }

    /**
     * Vérifie le code auprès du hub et retourne un jeton de preuve pour {@code setup-pin}.
     */
    public String verifyOtp(String phone, String code) {
        requireEnabled();
        String username = PhoneNormalizer.toUsername(phone);
        String e164 = PhoneNormalizer.toE164(username);
        if (!StringUtils.hasText(code)) {
            throw new CustomValidationException("Code OTP manquant.");
        }
        OtpVerifyResponse result;
        try {
            result = client().verifyOtp(OtpVerifyRequest.of(e164, code.trim()));
        } catch (NotificationHubClientException ex) {
            throw mapVerifyTransportError(ex);
        }
        if (result == null || !result.valid()) {
            throw new CustomValidationException(messageForReason(result != null ? result.reason() : null));
        }
        return issueProofToken(username);
    }

    public void assertProofToken(String expectedPhone, String proofToken) {
        String username = PhoneNormalizer.toUsername(expectedPhone);
        if (!StringUtils.hasText(proofToken)) {
            throw new CustomValidationException("Preuve OTP manquante. Vérifiez d'abord le code SMS.");
        }
        String[] parts = proofToken.split("\\.");
        if (parts.length != 3) {
            throw new CustomValidationException("Preuve OTP invalide.");
        }
        String phonePart = parts[0];
        String expPart = parts[1];
        String sigPart = parts[2];
        String expectedSig = hmac(phonePart + "." + expPart);
        if (!constantTimeEquals(expectedSig, sigPart)) {
            throw new CustomValidationException("Preuve OTP invalide.");
        }
        if (!PhoneNormalizer.matches(username, phonePart)) {
            throw new CustomValidationException("Le numéro vérifié ne correspond pas au téléphone saisi.");
        }
        long expEpoch;
        try {
            expEpoch = Long.parseLong(expPart);
        } catch (NumberFormatException e) {
            throw new CustomValidationException("Preuve OTP invalide.");
        }
        if (Instant.now().getEpochSecond() > expEpoch) {
            throw new CustomValidationException("La vérification SMS a expiré. Demandez un nouveau code.");
        }
    }

    private String issueProofToken(String username) {
        long exp = Instant.now()
                .plusSeconds(Math.max(1, hubProperties.getProofTtlMinutes()) * 60L)
                .getEpochSecond();
        String payload = username + "." + exp;
        return payload + "." + hmac(payload);
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(proofSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(raw);
        } catch (Exception e) {
            throw new IllegalStateException("Impossible de signer la preuve OTP", e);
        }
    }

    private String proofSecret() {
        if (StringUtils.hasText(hubProperties.getProofSecret())) {
            return hubProperties.getProofSecret();
        }
        return jwtSecret + ":customer-otp-proof";
    }

    private NotificationHubOtpClient client() {
        NotificationHubOtpClient client = otpClient.getIfAvailable();
        if (client == null) {
            throw new CustomValidationException(
                    "Notification Hub non configuré. Vérifiez optimize.notification.hub.enabled.");
        }
        return client;
    }

    private void requireEnabled() {
        if (!hubProperties.isEnabled()) {
            throw new CustomValidationException(
                    "L'envoi SMS OTP n'est pas activé sur ce serveur (Notification Hub).");
        }
    }

    private static String messageForReason(String reason) {
        if (reason == null) {
            return "Code incorrect. Réessayez.";
        }
        return switch (reason.toUpperCase(Locale.ROOT)) {
            case "EXPIRED" -> "Code expiré. Demandez un nouveau code.";
            case "MAX_ATTEMPTS" -> "Trop de tentatives. Demandez un nouveau code.";
            case "INVALID" -> "Code incorrect. Réessayez.";
            default -> "Code incorrect. Réessayez.";
        };
    }

    private CustomValidationException mapSendError(NotificationHubClientException ex) {
        Integer status = ex.getStatusCode();
        if (status != null && status == 429) {
            return new CustomValidationException(
                    "Veuillez patienter avant de renvoyer un code SMS.");
        }
        if (status != null && status == 422) {
            return new CustomValidationException(
                    "Service SMS temporairement indisponible. Contactez le support.");
        }
        log.error("Échec envoi OTP Notification Hub: {}", ex.getMessage());
        return new CustomValidationException("Impossible d'envoyer le SMS. Réessayez plus tard.");
    }

    private CustomValidationException mapVerifyTransportError(NotificationHubClientException ex) {
        log.error("Échec verify OTP Notification Hub: {}", ex.getMessage());
        return new CustomValidationException("Vérification SMS impossible. Réessayez plus tard.");
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
