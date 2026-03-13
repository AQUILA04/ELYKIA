package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SpecialDailyStakeUnitDto {
    private Long clientId;
    @NotNull(message = "Le montant de la mise est obligatoire")
    private Double amount;
    @NotNull(message = "L'identifiant du credit ne peut être nulle")
    private Long creditId;
    @NotBlank(message = "La référence du recouvrement est obligatoire !")
    private String recoveryId; // Mobile recovery ID
    private State state =State.ENABLED;

}
