package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreditListSummaryRequestDto(
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        CreditSearchDto search
) {
}
