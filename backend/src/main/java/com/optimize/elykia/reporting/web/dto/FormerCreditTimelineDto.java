package com.optimize.elykia.reporting.web.dto;

import java.time.LocalDateTime;

public record FormerCreditTimelineDto(
        Long creditId,
        Long id,
        Double amount,
        LocalDateTime operationDate,
        String reference
) {
}
