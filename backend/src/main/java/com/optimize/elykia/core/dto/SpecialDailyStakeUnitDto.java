package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SpecialDailyStakeUnitDto {
    private Long clientId;
    @NotNull(message = "Le montant de la mise est obligatoire")
    private Double amount;
    @NotNull(message = "L'identifiant du credit ne peut être nulle")
    private Long creditId;
}
