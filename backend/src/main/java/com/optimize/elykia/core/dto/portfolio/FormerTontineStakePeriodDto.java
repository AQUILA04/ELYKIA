package com.optimize.elykia.core.dto.portfolio;

import java.time.LocalDate;

public record FormerTontineStakePeriodDto(
        Double amount,
        LocalDate startDate,
        LocalDate endDate
) {
}
