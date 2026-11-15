package com.optimize.elykia.core.dto.commercial;

import java.time.LocalDate;

public record CommercialStaffWriteDto(
        String name,
        String phoneNumber,
        String serialNumber,
        LocalDate dateOfBirth) {
}
