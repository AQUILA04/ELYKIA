package com.optimize.elykia.core.dto.report;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
public class SurplusReallocationRequest {
    private String commercialUsername;
    private LocalDate startDate;
    private LocalDate endDate;
}
