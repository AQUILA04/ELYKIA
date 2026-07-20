package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.enumaration.InventoryStatus;
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
public class InventorySummaryDto {
    private Long id;
    private LocalDate inventoryDate;
    private InventoryStatus status;
    private String createdByUser;
    private LocalDateTime completedAt;
    private long itemCount;
    private long discrepancyCount;
}
