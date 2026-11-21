package com.optimize.elykia.inventory.web.dto;

import com.optimize.elykia.inventory.domain.InventoryItemStatus;
import com.optimize.elykia.inventory.domain.ReconciliationAction;
import com.optimize.elykia.inventory.domain.StockHistoryReferenceType;
import com.optimize.elykia.inventory.domain.StockOperationType;
import com.optimize.elykia.inventory.domain.TimelineNodeKind;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimelineNodeDto {
    private TimelineNodeKind kind;
    private LocalDateTime occurredAt;
    private Integer quantityBefore;
    private Integer quantityAfter;
    private Integer delta;
    private Boolean gapDetected;

    // MOVEMENT
    private Long historyId;
    private StockOperationType operationType;
    private String operationUser;
    private StockHistoryReferenceType referenceType;
    private Long referenceId;
    private String reason;

    // INVENTORY_CHECKPOINT
    private Long inventoryId;
    private Long inventoryItemId;
    private Integer systemQuantity;
    private Integer physicalQuantity;
    private Integer difference;
    private InventoryItemStatus itemStatus;
    private ReconciliationAction reconciliationAction;
}
