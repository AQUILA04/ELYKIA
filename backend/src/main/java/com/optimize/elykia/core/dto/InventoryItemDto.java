package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.enumaration.InventoryItemStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class InventoryItemDto {
    private Long id;
    private Long inventoryId;
    private Long articleId;
    private String articleName;
    private String articleMarque;
    private String articleModel;
    private String articleType;
    private Integer systemQuantity;
    private Integer physicalQuantity;
    private Integer difference;
    private InventoryItemStatus status;
    private String reconciliationComment;
    private String reconciledBy;
    private LocalDateTime reconciledAt;
    private Boolean markAsDebt;
    private Boolean debtCancelled;
    private State state =State.ENABLED;

}

