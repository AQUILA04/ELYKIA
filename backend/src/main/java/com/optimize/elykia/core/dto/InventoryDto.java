package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.InventoryStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class InventoryDto {
    private Long id;
    private LocalDate inventoryDate;
    private InventoryStatus status;
    private String createdByUser;
    private LocalDateTime completedAt;
    private List<InventoryItemDto> items;
}

