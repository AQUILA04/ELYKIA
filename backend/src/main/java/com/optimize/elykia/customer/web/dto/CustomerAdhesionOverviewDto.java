package com.optimize.elykia.customer.web.dto;

import java.util.List;

public record CustomerAdhesionOverviewDto(
        List<AdhesionViewDto> adhesions,
        List<CustomerAdhesionSubmissionDto> submissions
) {
}
