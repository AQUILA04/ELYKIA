package com.optimize.elykia.core.dto.portfolio;

import java.time.LocalDate;

public record FormerAgencySaleDto(
        Long creditId,
        String reference,
        Long clientId,
        String clientCode,
        String firstname,
        String lastname,
        String phone,
        String quarter,
        LocalDate saleDate,
        Double totalAmount
) {
}
