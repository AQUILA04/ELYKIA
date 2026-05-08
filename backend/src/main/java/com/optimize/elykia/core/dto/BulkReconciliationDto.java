package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.ReconciliationAction;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BulkReconciliationDto {
    @NotEmpty(message = "La liste des IDs d'articles d'inventaire est obligatoire")
    private List<Long> inventoryItemIds;

    private String comment;

    private Boolean markAsDebt = false;

    private Boolean cancelDebt = false;

    @NotNull(message = "L'action de réconciliation est obligatoire")
    private ReconciliationAction action;
}
