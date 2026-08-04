package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
public class CollectorTransferSummaryDto {
    private long creditCount;
    private double totalSalesAmount;
    private double totalPaidAtTransfer;
    private double totalRemainingAtTransfer;
    private List<CollectorTransferPairDto> byPair;
}
