package com.optimize.elykia.core.dto.report;

import com.optimize.elykia.core.enumaration.RemittanceStatus;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CashPeriodRemittanceSummaryDto {
    Integer year;
    Integer month;
    Double totalAmount;
    Double creditAmount;
    Double tontineAmount;
    Double newBalanceAmount;
    RemittanceStatus status;
    Long remittanceId;
    boolean canSubmit;
    boolean canAcknowledge;
    boolean canInitiate;
}
