package com.optimize.elykia.core.dto.debt;

import com.optimize.elykia.core.enumaration.DebtPeriodGrain;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateCashDebtRequestDto {
    @NotBlank
    private String commercialUsername;

    @NotNull
    private DebtPeriodGrain periodGrain;

    /** Requis si periodGrain = DAY */
    private LocalDate day;

    /** Requis si periodGrain = MONTH */
    private Integer year;
    private Integer month;
}
