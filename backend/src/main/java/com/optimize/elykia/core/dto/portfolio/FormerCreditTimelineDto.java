package com.optimize.elykia.core.dto.portfolio;

import java.time.LocalDateTime;

public record FormerCreditTimelineDto(
        Long creditId,
        Long id,
        Double amount,
        LocalDateTime operationDate,
        String reference
) {
}
