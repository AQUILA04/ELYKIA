package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.CreditStatus;
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
