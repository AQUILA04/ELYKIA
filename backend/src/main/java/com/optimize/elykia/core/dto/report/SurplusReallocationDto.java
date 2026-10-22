package com.optimize.elykia.core.dto.report;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class SurplusReallocationDto {
    Long id;
    String commercialUsername;
    LocalDate periodStart;
    LocalDate periodEnd;
    LocalDateTime performedAt;
    String performedBy;
    Double surplusBefore;
    Double creditAllocated;
    Double tontineAllocated;
    Double newBalanceAllocated;
    Double surplusRemaining;
    Double remainingBefore;
    Double remainingAfter;
    Double totalReallocated;
    List<SurplusReallocationLineDto> lines;
    List<SurplusReallocationDayDto> days;
    List<SurplusReallocationSourceDto> surplusByDay;
}
