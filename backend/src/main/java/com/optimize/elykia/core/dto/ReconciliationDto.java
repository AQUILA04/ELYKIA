package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.ReconciliationAction;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReconciliationDto {
    @NotNull(message = "L'ID de l'article d'inventaire est obligatoire")
    private Long inventoryItemId;

    private String comment;

    private Boolean markAsDebt = false;

    private Boolean cancelDebt = false;

    @NotNull(message = "L'action de réconciliation est obligatoire")
    private ReconciliationAction action;
}

