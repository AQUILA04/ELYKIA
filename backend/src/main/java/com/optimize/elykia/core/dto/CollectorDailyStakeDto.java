package com.optimize.elykia.core.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class CollectorDailyStakeDto {
    @Valid
    private List<DefaultDailyStakeUnitDto> stakeUnits;
    @NotBlank(message = "Le nom du collecteur est obligatoire !")
    private String collector;
}
