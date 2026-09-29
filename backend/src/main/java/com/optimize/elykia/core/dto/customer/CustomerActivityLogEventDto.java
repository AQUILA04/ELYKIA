package com.optimize.elykia.core.dto.customer;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
public class CustomerActivityLogEventDto {

    @NotNull
    private UUID eventId;

    @NotBlank
    @Size(max = 40)
    private String occurredAt;

    @NotBlank
    @Size(max = 40)
    private String category;

    @NotBlank
    @Size(max = 80)
    private String eventType;

    private String clientId;

    @Size(max = 30)
    private String phone;

    @Size(max = 64)
    private String deviceId;

    @Size(max = 64)
    private String sessionId;

    @Size(max = 20)
    private String platform;

    @Size(max = 40)
    private String appVersion;

    @Size(max = 200)
    private String screen;

    private Integer httpStatus;

    @Size(max = 1000)
    private String message;

    private Map<String, Object> metadata;
}
