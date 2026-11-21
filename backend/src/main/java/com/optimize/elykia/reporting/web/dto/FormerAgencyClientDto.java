package com.optimize.elykia.reporting.web.dto;

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
