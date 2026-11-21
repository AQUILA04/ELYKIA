package com.optimize.elykia.reporting.web.dto;

import java.time.LocalDate;

public record FormerTontineStakePeriodDto(
        Double amount,
        LocalDate startDate,
        LocalDate endDate
) {
}
