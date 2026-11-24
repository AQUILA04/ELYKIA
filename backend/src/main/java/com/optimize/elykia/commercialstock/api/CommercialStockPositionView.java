package com.optimize.elykia.commercialstock.api;

import java.util.List;

/** Vue en lecture d'une position continue avec ses couches FIFO ouvertes. */
public record CommercialStockPositionView(
        Long positionId,
        String collector,
        Long articleId,
        StockActivityType activityType,
        int quantityOnHand,
        Double weightedAvgPurchaseCost,
        Double currentSaleUnitPrice,
        List<LayerView> layers) {

    public record LayerView(Long layerId, int quantityRemaining, double unitPurchaseCost, Double effectiveSalePrice) {
    }
    public String commercialUsername() {
        return collector;
    }
}
