package com.optimize.elykia.core.dto;

import lombok.Getter;

/**
 * Agrégat mensuel des cotisations par membre (COUNT + SUM côté SQL).
 */
@Getter
public class TontineMemberMonthlyAggregateDto {
    private final Long memberId;
    private final int year;
    private final int month;
    private final long collectionCount;
    private final double totalAmount;

    public TontineMemberMonthlyAggregateDto(
            Long memberId,
            Integer year,
            Integer month,
            Long collectionCount,
            Number totalAmount) {
        this.memberId = memberId;
        this.year = year != null ? year : 0;
        this.month = month != null ? month : 0;
        this.collectionCount = collectionCount != null ? collectionCount : 0L;
        this.totalAmount = totalAmount != null ? totalAmount.doubleValue() : 0.0;
    }
}
