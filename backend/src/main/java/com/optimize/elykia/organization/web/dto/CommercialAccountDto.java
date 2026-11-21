package com.optimize.elykia.organization.web.dto;

import java.time.LocalDate;

public record CommercialAccountDto(
        Long userId,
        String username,
        String firstname,
        String lastname,
        Long currentAssignmentId,
        Long holderId,
        String holderName,
        String holderPhotoUrl,
        String holderInitials,
        LocalDate holderSince) {
}
