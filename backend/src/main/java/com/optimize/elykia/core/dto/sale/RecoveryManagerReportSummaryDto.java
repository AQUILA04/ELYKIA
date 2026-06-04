package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class RecoveryManagerReportSummaryDto {
    private Double totalAmountCollected;
    private Integer totalOperationsCount;
    private Integer commercialsCount;
    private List<CommercialRemittanceDto> remittanceByCommercial;
}
