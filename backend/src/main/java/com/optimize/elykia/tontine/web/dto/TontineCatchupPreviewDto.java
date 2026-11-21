package com.optimize.elykia.tontine.web.dto;

import java.time.LocalDate;

public record TontineCatchupPreviewDto(
        LocalDate collectionDate,
        LocalDate monthStart,
        LocalDate monthEnd,
        Double applicableDailyStake,
        boolean monthLocked,
        long existingCollectionsCount) {
}
