package com.optimize.elykia.core.dto.customer;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class CustomerActivityLogSearchCriteria {
    private Long clientId;
    private String phone;
    private String deviceId;
    private String sessionId;
    private Instant from;
    private Instant to;
    private String category;
    private String source;
    private String platform;
    private String appVersion;
    private Integer httpStatus;
    private Integer httpStatusFrom;
    private Integer httpStatusTo;
    private String q;
    /** SUCCESS | FAILURE | INFO — dérivé des eventType / category. */
    private String outcome;
    private List<String> eventTypes;
}
