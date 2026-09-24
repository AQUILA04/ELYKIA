package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.CreditStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleCancellationExecuteDto {
    @NotBlank(message = "Le commercial est obligatoire")
    private String commercialUsername;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDate startDate;

    @NotNull(message = "La date de fin est obligatoire")
    private LocalDate endDate;

    private CreditStatus creditStatus; // null pour tous

    @NotBlank(message = "Le motif d'annulation est obligatoire pour l'audit")
    private String cancellationReason;

    /** Identifiants des ventes éligibles confirmés par la simulation ; ignore les ventes apparues entre-temps. */
    private List<Long> eligibleCreditIds;
}
