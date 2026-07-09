package com.optimize.elykia.core.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class CommercialStockDashboardExportDTO {
    private String articleName;
    private Double unitPrice;
    private Long quantityTaken = 0L;
    private Long quantitySold = 0L;
    private Long quantityReturned = 0L;
    private Double soldValue = 0.0;
    private String type;
    private String marque;
    private String model;
    private String name;

    public CommercialStockDashboardExportDTO(
            String articleName,
            Double unitPrice,
            Long quantityTaken,
            Long quantitySold,
            Long quantityReturned,
            Double soldValue,
            String type,
            String marque,
            String model,
            String name) {
        this.articleName = articleName;
        this.unitPrice = unitPrice != null ? unitPrice : 0.0;
        this.quantityTaken = quantityTaken != null ? quantityTaken : 0L;
        this.quantitySold = quantitySold != null ? quantitySold : 0L;
        this.quantityReturned = quantityReturned != null ? quantityReturned : 0L;
        this.soldValue = soldValue != null ? soldValue : 0.0;
        this.type = type;
        this.marque = marque;
        this.model = model;
        this.name = name;
    }

    public Long getQuantityRemaining() {
        return quantityTaken - quantitySold - quantityReturned;
    }

    public Double getRemainingValue() {
        return getQuantityRemaining() * unitPrice;
    }
}
