package com.optimize.elykia.tontine.web.dto;

public record TontineCommercialVoidRequest(
        String commercialUsername,
        Integer sessionYear
) {
}
