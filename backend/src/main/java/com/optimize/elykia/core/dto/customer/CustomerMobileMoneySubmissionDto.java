package com.optimize.elykia.core.dto.customer;

import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class CustomerMobileMoneySubmissionDto {
    Long id;
    Long clientId;
    String clientName;
    Long creditId;
    Integer installmentNumber;
    Double expectedAmount;
    String mobileMoneyPhone;
    Double mobileMoneyAmount;
    String mobileMoneyReference;
    String notes;
    CustomerSubmissionStatus status;
    String targetCollector;
    String tontineCollector;
    LocalDateTime createdAt;
}
