package com.optimize.elykia.core.dto.customer;

import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Value
@Builder
public class CustomerTontineMmSubmissionDto {
    Long id;
    Long clientId;
    String clientName;
    Long tontineMemberId;
    Double expectedAmount;
    String mobileMoneyPhone;
    Double mobileMoneyAmount;
    String mobileMoneyReference;
    String notes;
    LocalDate operationDate;
    CustomerSubmissionStatus status;
    String tontineCollector;
    Long tontineCollectionId;
    LocalDateTime createdAt;
}
