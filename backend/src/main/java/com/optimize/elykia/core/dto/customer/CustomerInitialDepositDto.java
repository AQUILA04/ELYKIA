package com.optimize.elykia.core.dto.customer;

import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CustomerInitialDepositDto {
    private Long id;
    private Long clientId;
    private String mobileMoneyPhone;
    private Double mobileMoneyAmount;
    private String mobileMoneyReference;
    private String notes;
    private CustomerSubmissionStatus status;
    private LocalDateTime validatedAt;
    private String validatedBy;
    private LocalDateTime rejectedAt;
    private String rejectedBy;
    private String rejectionReason;
}
