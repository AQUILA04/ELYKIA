package com.optimize.elykia.core.dto.report;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class CashPeriodRemittanceRequest {
    private Integer year;
    private Integer month;
    private LocalDate startDate;
    private LocalDate endDate;
    private List<Long> expenseIds;
}
