package com.optimize.elykia.core.dto.portfolio;

import java.time.LocalDateTime;

public record FormerTontineCollectionDto(
        Long memberId,
        Long id,
        Double amount,
        LocalDateTime collectionDate,
        String reference
) {
}
