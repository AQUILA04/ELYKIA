package com.optimize.common.securities.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DeviceInfoDto {
    private String deviceId;
    private String deviceLabel;
    private String platform;
    private String model;
    private String appVersion;
}
