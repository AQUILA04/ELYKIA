package com.optimize.elykia.core.dto;

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
    private String type;
    private String marque;
    private String model;
    private String name;

    public StockRequestExportDTO(String articleName, Long totalQuantity, Double unitPrice, Double totalAmount) {
        this(articleName, totalQuantity, unitPrice, totalAmount, 0L, null, null, null, null);
    }

    public StockRequestExportDTO(
            String articleName,
            Long totalQuantity,
            Double unitPrice,
            Double totalAmount,
            String type,
            String marque,
            String model,
            String name) {
        this(articleName, totalQuantity, unitPrice, totalAmount, 0L, type, marque, model, name);
    }

    public StockRequestExportDTO(String articleName, Long totalQuantity, Double unitPrice) {
        this(articleName, totalQuantity, unitPrice, 0.0, 0L, null, null, null, null);
    }

    public StockRequestExportDTO(String articleName, Long totalQuantity) {
        this(articleName, totalQuantity, 0.0, 0.0, 0L, null, null, null, null);
    }

    public Long getNetQuantity() {
        return totalQuantity - returnedQuantity;
    }

    public Double getNetAmount() {
        return getNetQuantity() * unitPrice;
    }
}
