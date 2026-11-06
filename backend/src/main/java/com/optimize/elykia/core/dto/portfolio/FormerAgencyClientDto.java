package com.optimize.elykia.core.dto.portfolio;

import java.util.List;

public record FormerAgencyClientDto(
        Long clientId,
        String clientCode,
        String firstname,
        String lastname,
        String phone,
        String quarter,
        Double ownSalesTotal,
        List<FormerAgencySaleDto> sales
) {
}
