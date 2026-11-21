package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.DebtSettlementMode;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class DebtSettlementDto {
    Long id;
    String reference;
    DebtSettlementMode settlementMode;
    Double amount;
    Long surplusDebtId;
    String note;
    String performedBy;
    LocalDateTime performedAt;
    List<DebtAllocationDto> allocations;
}
