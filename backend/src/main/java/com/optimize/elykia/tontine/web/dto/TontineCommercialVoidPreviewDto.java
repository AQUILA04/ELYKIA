package com.optimize.elykia.tontine.web.dto;

public record TontineCommercialVoidPreviewDto(
        Long sessionId,
        Integer sessionYear,
        String commercialUsername,
        long collectionsCount,
        double collectionsAmount,
        long membersAffected,
        long membersWithOtherCollections,
        double preservedAmount,
        long deliveryCollectionsCount,
        int reportDays
) {
}
