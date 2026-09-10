package com.optimize.elykia.core.notificationhub;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * DTOs alignés sur l'API OTP Notification Hub ({@code /v1/otp/*}).
 */
public final class NotificationHubOtpModels {

    private NotificationHubOtpModels() {
    }

    public record OtpSendRequest(
            String to,
            String channel,
            Map<String, Object> metadata,
            String environment) {

        public static OtpSendRequest sms(String e164, String environment) {
            return new OtpSendRequest(e164, "SMS", null, environment);
        }
    }

    public record OtpSendResponse(
            UUID sessionId,
            Instant expiresAt,
            UUID notificationId,
            String channel,
            String provider,
            String providerReference) {
    }

    public record OtpVerifyRequest(String to, String code, String channel, UUID sessionId) {

        public static OtpVerifyRequest of(String e164, String code) {
            return new OtpVerifyRequest(e164, code, null, null);
        }
    }

    public record OtpVerifyResponse(boolean valid, String reason) {
    }
}
