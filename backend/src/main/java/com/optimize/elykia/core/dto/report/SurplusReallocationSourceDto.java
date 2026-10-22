package com.optimize.elykia.core.dto.report;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

@Value
@Builder
public class SurplusReallocationSourceDto {
    LocalDate date;
    Double surplus;
}
