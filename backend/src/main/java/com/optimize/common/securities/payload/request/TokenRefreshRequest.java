package com.optimize.common.securities.payload.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TokenRefreshRequest {
    @NotBlank
    private String refreshToken;

    private String deviceId;
    private String deviceLabel;
    private String platform;
    private String model;
    private String appVersion;
}
