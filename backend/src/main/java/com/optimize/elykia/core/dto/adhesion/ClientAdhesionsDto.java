package com.optimize.elykia.core.dto.adhesion;

import java.util.List;

public record ClientAdhesionsDto(Long clientId, List<AdhesionViewDto> adhesions) {
}
