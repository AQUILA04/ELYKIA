package com.optimize.elykia.commercialstock.domain;

/** Part d'une consommation FIFO prélevée sur une couche donnée. */
public record ConsumptionLine(CommercialStockLayer layer, int quantity, double unitPurchaseCost, double unitSalePrice) {

    public double purchaseValue() {
        return quantity * unitPurchaseCost;
    }

    public double saleValue() {
        return quantity * unitSalePrice;
    }
}
