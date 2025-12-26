package com.optimize.elykia.core.dto;

public class StockValuesDto {
    private Double purchaseTotal;
    private Double creditSaleTotal;

    // Constructeur que JPA va utiliser pour créer l'objet
    public StockValuesDto(Double purchaseTotal, Double creditSaleTotal) {
        this.purchaseTotal = purchaseTotal;
        this.creditSaleTotal = creditSaleTotal;
    }

    // Getters
    public Double getPurchaseTotal() {
        return purchaseTotal;
    }

    public Double getCreditSaleTotal() {
        return creditSaleTotal;
    }
}
