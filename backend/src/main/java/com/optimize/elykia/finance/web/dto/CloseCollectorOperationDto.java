package com.optimize.elykia.finance.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.elykia.finance.domain.DailyAccounting;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CloseCollectorOperationDto {
    private String collector;
    private Double realTotalAmount;
    @JsonIgnore
    private LocalDate accountingDate;
    @JsonIgnore
    private DailyAccounting dailyAccounting;
}
