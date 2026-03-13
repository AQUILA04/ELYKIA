package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Set;

@Data
public class SpecialDailyStakeDto {
    @Valid
    private Set<SpecialDailyStakeUnitDto> stakeUnits;
    @NotBlank(message = "Le nom du collecteur est obligatoire !")
    private String collector;
    private State state =State.ENABLED;

}
