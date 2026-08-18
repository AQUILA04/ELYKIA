package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class RmPackTontineMemberDto {
    private Long id;
    private Long clientId;
    private String clientName;
    private String clientPhone;
    private String clientQuarter;
    private String tontineCollector;
    private Integer sessionYear;
    private Double amount;
    private Double totalContribution;
    private String deliveryStatus;
    private Boolean carnetVerified;
    private LocalDateTime carnetVerifiedAt;
    private String carnetVerifiedBy;
    private List<RmPackTontineMonthDto> months;
}
