package com.optimize.elykia.core.dto;

import lombok.Getter;

/**
 * Agrégat mensuel des cotisations par membre et commercial collecteur.
 */
@Getter
public class TontineMemberMonthlyByCommercialAggregateDto {
    private final Long memberId;
    private final String commercialUsername;
    private final int year;
    private final int month;
    private final long collectionCount;
    private final double totalAmount;

    public TontineMemberMonthlyByCommercialAggregateDto(
            Long memberId,
            String commercialUsername,
            Integer year,
            Integer month,
            Long collectionCount,
            Number totalAmount) {
        this.memberId = memberId;
        this.commercialUsername = commercialUsername;
        this.year = year != null ? year : 0;
        this.month = month != null ? month : 0;
        this.collectionCount = collectionCount != null ? collectionCount : 0L;
        this.totalAmount = totalAmount != null ? totalAmount.doubleValue() : 0.0;
    }
}
