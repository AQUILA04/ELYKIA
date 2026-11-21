package com.optimize.elykia.carnet.web.dto;

import com.optimize.elykia.carnet.domain.FieldDayPlanStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class FieldDayPlanDto {
    private Long id;
    private String recoveryManagerUsername;
    private LocalDate planDate;
    private FieldDayPlanStatus status;
    private List<String> commercialUsernames;
    private List<String> quarters;
}
