package com.optimize.elykia.finance.web.dto;

import com.optimize.elykia.finance.domain.WeekStatus;
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
}
