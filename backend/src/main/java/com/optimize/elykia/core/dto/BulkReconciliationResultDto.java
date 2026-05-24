package com.optimize.elykia.core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkReconciliationResultDto {
    private List<ReconciliationItemResult> results;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReconciliationItemResult {
        private Long inventoryItemId;
        private boolean success;
        private String message;
        private InventoryItemDto item;
    }
}
