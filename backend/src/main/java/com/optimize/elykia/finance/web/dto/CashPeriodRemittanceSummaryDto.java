package com.optimize.elykia.finance.web.dto;

import com.optimize.elykia.finance.domain.RemittanceStatus;
import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class CashPeriodRemittanceSummaryDto {
    Integer year;
    Integer month;
    Double totalAmount;
    Double creditAmount;
    Double tontineAmount;
    Double newBalanceAmount;
    Double expenseAmount;
    Double netAmount;
    RemittanceStatus status;
    Long remittanceId;
    boolean canSubmit;
    boolean canAcknowledge;
    boolean canInitiate;
    List<ExpenseDto> candidateExpenses;
    List<ExpenseDto> linkedExpenses;
    Double alreadyRemittedAmount;
}
