package com.optimize.elykia.core.dto.portfolio;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record FormerCreditDetailDto(
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
        Double ownRecoveriesTotal,
        List<FormerCreditTimelineDto> timelines
) {
}
