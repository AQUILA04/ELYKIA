package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Builder
public class CustomerActivityLogDto {
    private Long id;
    private UUID eventId;
    private Instant occurredAt;
    private Instant receivedAt;
    private String source;
    private String category;
    private String eventType;
    private Long clientId;
    private String phone;
    private String deviceId;
    private String sessionId;
    private String platform;
    private String appVersion;
    private String screen;
    private Integer httpStatus;
    private String message;
    private Map<String, Object> metadata;
    private String ip;
    private String userAgent;
}
