package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class CustomerOtpSendResponse {
    private final UUID sessionId;
    private final Instant expiresAt;
    private final String channel;
    /** Référence courte associée au SMS OTP (ex. Y4GP), fournie par Notification Hub. */
    private final String reference;
}
