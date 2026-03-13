package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DefaultDailyStakeUnitDto {
    @NotNull(message = "L'ID du crédit est obligatoire !")
    private Long creditId;
    @NotBlank(message = "La référence du recouvrement est obligatoire !")
    private String recoveryId; // Mobile recovery ID
    private State state =State.ENABLED;

}
