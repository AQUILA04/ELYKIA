package com.optimize.elykia.core.dto.debt;

import com.optimize.elykia.core.enumaration.DebtHolderProfile;
import com.optimize.elykia.core.enumaration.DebtPeriodGrain;
import com.optimize.elykia.core.enumaration.DebtStatus;
import com.optimize.elykia.core.enumaration.DebtType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class DebtDocumentDto {
    Long id;
    String reference;
    String holderUsername;
    DebtHolderProfile holderProfile;
    DebtType debtType;
    DebtPeriodGrain periodGrain;
    Integer periodYear;
    Integer periodMonth;
    LocalDate periodDay;
    DebtStatus status;
    Double grossAmount;
    Double offsetAmount;
    Double paidAmount;
    Double remainingAmount;
    Long monthlyStockId;
    Long dailyReportId;
    Long inventoryId;
    String createdBy;
    LocalDateTime dateReg;
    String cancelledBy;
    LocalDateTime cancelledAt;
    String cancelReason;
    List<DebtLineDto> lines;
    List<DebtSettlementDto> settlements;
}
