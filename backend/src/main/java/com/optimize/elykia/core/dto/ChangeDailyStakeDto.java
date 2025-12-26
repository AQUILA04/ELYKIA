package com.optimize.elykia.core.dto;

import jakarta.validation.constraints.NotNull;

public record ChangeDailyStakeDto (@NotNull(message = "L'identifiant du crédit est obligatoire !") Long creditId,
                                   @NotNull(message = "La valeur de la nouvelle mise est obligatoire !") Double dailyStake) {
}
