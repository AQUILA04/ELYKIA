package com.optimize.elykia.organization.web.dto;

import java.time.LocalDate;

public record CommercialAssignmentWriteDto(
        Long promoterId,
        LocalDate startDate,
        LocalDate endDate) {
}
