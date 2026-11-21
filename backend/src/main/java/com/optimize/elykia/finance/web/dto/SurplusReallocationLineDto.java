package com.optimize.elykia.finance.web.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

@Value
@Builder
public class SurplusReallocationLineDto {
    Long cashDepositId;
    String depositReference;
    LocalDate depositDate;
    LocalDate targetDate;
    Double surplusTaken;
    Double creditAllocated;
    Double tontineAllocated;
    Double newBalanceAllocated;
}
