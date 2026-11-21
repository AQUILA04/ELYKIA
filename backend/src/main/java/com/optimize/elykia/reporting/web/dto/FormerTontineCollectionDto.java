package com.optimize.elykia.reporting.web.dto;

import java.time.LocalDateTime;

public record FormerTontineCollectionDto(
        Long memberId,
        Long id,
        Double amount,
        LocalDateTime collectionDate,
        String reference
) {
}
