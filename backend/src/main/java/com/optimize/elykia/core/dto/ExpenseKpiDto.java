package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseKpiDto {
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalAmount;
    private String periodLabel; // e.g. "This Week", "This Month"
}
