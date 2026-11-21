package com.optimize.elykia.inventory.web.dto;

import com.optimize.elykia.inventory.domain.InventoryStatus;
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
    private Long itemCount;
    private Long discrepancyCount;
    private List<InventoryItemDto> items;
}

