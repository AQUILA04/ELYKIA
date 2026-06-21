package com.optimize.elykia.core.dto;

public class StockValuesDto {
    private Double purchaseTotal;
    private Double creditSaleTotal;
    private Double sellingSaleTotal;

    // Constructeur que JPA va utiliser pour créer l'objet
    public StockValuesDto(Double purchaseTotal, Double creditSaleTotal, Double sellingSaleTotal) {
        this.purchaseTotal = purchaseTotal;
        this.creditSaleTotal = creditSaleTotal;
        this.sellingSaleTotal = sellingSaleTotal;
    }

    // Getters
    public Double getPurchaseTotal() {
        return purchaseTotal;
    }

    public Double getCreditSaleTotal() {
        return creditSaleTotal;
    }

    public Double getSellingSaleTotal() {
        return sellingSaleTotal;
    }
}
