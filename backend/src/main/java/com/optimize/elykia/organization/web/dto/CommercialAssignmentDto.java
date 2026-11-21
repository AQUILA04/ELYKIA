package com.optimize.elykia.organization.web.dto;

import java.time.LocalDate;

public record CommercialAssignmentDto(
        Long id,
        Long userId,
        String username,
        Long promoterId,
        String promoterName,
        String photoUrl,
        String initials,
        LocalDate startDate,
        LocalDate endDate,
        boolean current) {
}
