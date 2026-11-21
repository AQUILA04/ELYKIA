package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.DebtHolderProfile;
import com.optimize.elykia.sale.domain.DebtPeriodGrain;
import com.optimize.elykia.sale.domain.DebtStatus;
import com.optimize.elykia.sale.domain.DebtType;
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
