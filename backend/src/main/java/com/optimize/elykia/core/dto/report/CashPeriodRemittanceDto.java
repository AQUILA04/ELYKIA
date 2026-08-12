package com.optimize.elykia.core.dto.report;

import com.optimize.elykia.core.enumaration.RemittanceInitiator;
import com.optimize.elykia.core.enumaration.RemittanceStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class CashPeriodRemittanceDto {
    Long id;
    Integer year;
    Integer month;
    Double totalAmount;
    Double creditAmount;
    Double tontineAmount;
    Double newBalanceAmount;
    RemittanceStatus status;
    RemittanceInitiator initiatedBy;
    Double expenseAmount;
    Double netAmount;
    String submittedBy;
    String receivedBy;
    LocalDateTime submittedAt;
    LocalDateTime receivedAt;
    String reference;
}
