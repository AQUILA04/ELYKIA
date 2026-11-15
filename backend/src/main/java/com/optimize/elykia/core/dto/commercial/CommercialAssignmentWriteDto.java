package com.optimize.elykia.core.dto.commercial;

import java.time.LocalDate;

public record CommercialAssignmentWriteDto(
        Long promoterId,
        LocalDate startDate,
        LocalDate endDate) {
}
