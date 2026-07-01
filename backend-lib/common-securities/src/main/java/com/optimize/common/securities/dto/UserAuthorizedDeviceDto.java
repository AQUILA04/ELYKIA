package com.optimize.common.securities.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class UserAuthorizedDeviceDto {
    private Long id;
    private String deviceLabel;
    private String platform;
    private String model;
    private String appVersion;
    private Instant registeredAt;
    private Instant lastSeenAt;
    private boolean active;
    private String registeredBy;
}
