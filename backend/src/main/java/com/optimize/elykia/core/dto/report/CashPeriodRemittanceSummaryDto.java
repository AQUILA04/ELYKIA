package com.optimize.elykia.core.dto.report;

import com.optimize.elykia.core.dto.ExpenseDto;
import com.optimize.elykia.core.enumaration.RemittanceStatus;
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
}
