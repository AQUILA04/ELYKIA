package com.optimize.elykia.organization.web.dto;

import java.util.List;

public record CommercialStaffDetailDto(
        CommercialStaffDto person,
        List<CommercialAssignmentDto> assignments) {
}
