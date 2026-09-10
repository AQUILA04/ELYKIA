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
}
