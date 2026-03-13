package com.optimize.elykia.core.dto;

import com.optimize.common.entities.enums.State;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StockRequestExportDTO {
    private String articleName;
    private Long totalQuantity;
    private Double unitPrice;
    private Double totalAmount;
    private Long returnedQuantity;
    private State state =State.ENABLED;


    public StockRequestExportDTO(String articleName, Long totalQuantity, Double unitPrice, Double totalAmount) {
        this.articleName = articleName;
        this.totalQuantity = totalQuantity;
        this.unitPrice = unitPrice;
        this.totalAmount = totalAmount;
        this.returnedQuantity = 0L;
    }

    public StockRequestExportDTO(String articleName, Long totalQuantity, Double unitPrice) {
        this.articleName = articleName;
        this.totalQuantity = totalQuantity;
        this.unitPrice = unitPrice;
        this.totalAmount = 0.0;
        this.returnedQuantity = 0L;
    }

    public StockRequestExportDTO(String articleName, Long totalQuantity) {
        this.articleName = articleName;
        this.totalQuantity = totalQuantity;
        this.unitPrice = 0.0;
        this.totalAmount = 0.0;
        this.returnedQuantity = 0L;
    }

    public Long getNetQuantity() {
        return totalQuantity - returnedQuantity;
    }

    public Double getNetAmount() {
        return getNetQuantity() * unitPrice;
    }
}
