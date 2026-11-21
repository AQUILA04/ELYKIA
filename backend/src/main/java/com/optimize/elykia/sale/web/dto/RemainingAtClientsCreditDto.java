package com.optimize.elykia.sale.web.dto;

import java.time.LocalDate;

/**
 * Projection minimale d'un crédit encore dû (bilan annuel « reste chez les clients »).
 */
public record RemainingAtClientsCreditDto(
        Long id,
        String reference,
        String clientLastname,
        String clientFirstname,
        LocalDate beginDate,
        Double totalAmount,
        Double totalAmountRemaining
) {
}
