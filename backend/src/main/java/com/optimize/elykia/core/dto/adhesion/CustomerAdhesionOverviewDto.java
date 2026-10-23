package com.optimize.elykia.core.dto.adhesion;

import java.util.List;

public record CustomerAdhesionOverviewDto(
        List<AdhesionViewDto> adhesions,
        List<CustomerAdhesionSubmissionDto> submissions
) {
}
