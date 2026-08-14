package com.optimize.elykia.core.dto;

import lombok.Getter;

@Getter
public class TontineMemberContributionByCommercialDto {
    private final String commercialUsername;
    private final long collectionsCount;
    private final double totalAmount;
    private final boolean currentCollector;

    public TontineMemberContributionByCommercialDto(
            String commercialUsername,
            Long collectionsCount,
            Number totalAmount) {
        this(commercialUsername, collectionsCount, totalAmount, false);
    }

    public TontineMemberContributionByCommercialDto(
            String commercialUsername,
            Long collectionsCount,
            Number totalAmount,
            boolean currentCollector) {
        this.commercialUsername = commercialUsername;
        this.collectionsCount = collectionsCount != null ? collectionsCount : 0L;
        this.totalAmount = totalAmount != null ? totalAmount.doubleValue() : 0.0;
        this.currentCollector = currentCollector;
    }
}
