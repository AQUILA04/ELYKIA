package com.optimize.elykia.inventory.web.dto;

import com.optimize.elykia.inventory.domain.InventoryItemStatus;
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
}

