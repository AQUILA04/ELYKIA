package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.enumaration.WeekStatus;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AgencyWeeklyReportDto {
    private Long id;
    private Integer weekNumber;
    private LocalDate weekFrom;
    private LocalDate weekTo;
    private Double totalAmount;
    private Double totalCollection;
    private Double totalSpending;
    private WeekStatus status;
    private State state =State.ENABLED;

}
