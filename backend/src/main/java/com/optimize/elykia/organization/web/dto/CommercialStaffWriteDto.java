package com.optimize.elykia.organization.web.dto;

import java.time.LocalDate;

public record CommercialStaffWriteDto(
        String name,
        String phoneNumber,
        String serialNumber,
        LocalDate dateOfBirth) {
}
