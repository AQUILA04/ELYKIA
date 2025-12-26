package com.optimize.elykia.core.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class AccountingReportDto {
    private Double totalAmount;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private Double releasedTotalAmount;
}
