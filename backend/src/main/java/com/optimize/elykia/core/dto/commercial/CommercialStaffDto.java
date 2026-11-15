package com.optimize.elykia.core.dto.commercial;

import java.time.LocalDate;

public record CommercialStaffDto(
        Long id,
        String name,
        String phoneNumber,
        String serialNumber,
        LocalDate dateOfBirth,
        String photoUrl,
        String initials) {
}
