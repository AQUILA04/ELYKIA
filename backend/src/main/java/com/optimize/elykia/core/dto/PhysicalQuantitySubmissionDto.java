package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.util.Map;

@Data
public class PhysicalQuantitySubmissionDto {
    @NotNull(message = "L'ID de l'inventaire est obligatoire")
    private Long inventoryId;

    @NotNull(message = "Les quantités physiques sont obligatoires")
    private Map<Long, @PositiveOrZero(message = "La quantité doit être positive ou nulle") Integer> items;
    private State state =State.ENABLED;

}

