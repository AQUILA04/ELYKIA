package com.optimize.elykia.core.dto.report;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

@Value
@Builder
public class SurplusReallocationDayDto {
    LocalDate date;
    Double creditGap;
    Double tontineGap;
    Double newBalanceGap;
    Double creditAllocated;
    Double tontineAllocated;
    Double newBalanceAllocated;
    Boolean priority;
    Boolean beforePeriod;
}
