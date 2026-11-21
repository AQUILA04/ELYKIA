package com.optimize.elykia.sale.web.dto;

import com.optimize.elykia.sale.domain.CreditStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleCancellationFilterDto {
    private String commercialUsername;
    private LocalDate startDate;
    private LocalDate endDate;
    private CreditStatus creditStatus; // null signifie TOUS les statuts
}
