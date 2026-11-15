package com.optimize.elykia.core.dto.commercial;

import java.util.List;

public record CommercialStaffDetailDto(
        CommercialStaffDto person,
        List<CommercialAssignmentDto> assignments) {
}
