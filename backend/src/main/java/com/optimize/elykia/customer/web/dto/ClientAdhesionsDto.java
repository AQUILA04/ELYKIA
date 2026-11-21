package com.optimize.elykia.customer.web.dto;

import java.util.List;

public record ClientAdhesionsDto(Long clientId, List<AdhesionViewDto> adhesions) {
}
