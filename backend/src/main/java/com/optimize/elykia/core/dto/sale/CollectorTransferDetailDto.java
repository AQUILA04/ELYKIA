package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class CollectorTransferDetailDto {
    private Long historyId;
    private Long creditId;
    private String creditReference;
    private String creditStatus;
    private String clientName;
    private String clientPhone;
    private String oldCollector;
    private String newCollector;
    private Double totalAmount;
    private Double totalAmountPaid;
    private Double totalAmountRemaining;
    private Double currentAmountPaid;
    private Double currentAmountRemaining;
    private LocalDateTime changeDate;
    private String operatedBy;
}
