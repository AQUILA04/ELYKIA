package com.optimize.elykia.core.dto.bi;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SalesTrendDto {
    private LocalDate date;
    private Integer salesCount;
    private Double totalAmount;
    private Double totalProfit;
    private Double averageSaleAmount;
}
