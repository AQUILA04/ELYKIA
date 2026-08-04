package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class CollectorTransferPairDto {
    private String oldCollector;
    private String newCollector;
    private long creditCount;
    private double totalSalesAmount;
    private double totalPaidAtTransfer;
    private double totalRemainingAtTransfer;
    private LocalDateTime firstTransferDate;
    private LocalDateTime lastTransferDate;
}
