package com.optimize.elykia.core.dto.portfolio;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record FormerCreditListItemDto(
        Long creditId,
        String reference,
        Long clientId,
        String clientCode,
        String firstname,
        String lastname,
        String phone,
        String quarter,
        LocalDate beginDate,
        LocalDateTime handoverDate,
        Double totalAmountAtHandover,
        Double totalPaidAtHandover,
        Double totalRemainingAtHandover,
        Double ownRecoveriesTotal
) {
}
