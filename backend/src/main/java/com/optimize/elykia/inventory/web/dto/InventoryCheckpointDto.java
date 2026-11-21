package com.optimize.elykia.inventory.web.dto;

import com.optimize.elykia.inventory.domain.InventoryItemStatus;
import com.optimize.elykia.inventory.domain.InventoryStatus;
import com.optimize.elykia.inventory.domain.ReconciliationAction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryCheckpointDto {
    private Long inventoryId;
    private Long inventoryItemId;
    private LocalDate inventoryDate;
    private LocalDateTime completedAt;
    private LocalDateTime anchorAt;
    private InventoryStatus inventoryStatus;
    private Integer systemQuantity;
    private Integer physicalQuantity;
    private Integer difference;
    private InventoryItemStatus itemStatus;
    private Integer baselineSystemQuantity;
    private ReconciliationAction reconciliationAction;
    private Boolean markAsDebt;
    private Boolean debtCancelled;
}
