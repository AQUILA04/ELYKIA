package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class InventoryControlPdfDto {
    private Long inventoryId;
    private LocalDate inventoryDate;
    private String createdBy;
    private List<InventoryItemPdfDto> items;

    @Data
    public static class InventoryItemPdfDto {
        private Integer index;
        private String articleName;
        private String marque;
        private String model;
        private String type;
        private Integer systemQuantity;
        private Integer physicalQuantity;
        private Integer difference;
        private String status;
        private State state =State.ENABLED;

    }
}

