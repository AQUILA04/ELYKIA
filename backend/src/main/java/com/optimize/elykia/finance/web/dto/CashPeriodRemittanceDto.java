package com.optimize.elykia.finance.web.dto;

import com.optimize.elykia.finance.domain.RemittanceInitiator;
import com.optimize.elykia.finance.domain.RemittanceStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

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
    List<CashDepositDto> deposits;
}
