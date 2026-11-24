package com.optimize.elykia.commercialstock.api;

import java.util.List;

/** Résultat d'une opération du ledger : coût d'achat FIFO exact, prix résolu, marge et détail par couche. */
public record CommercialStockConsumptionResult(
        Long movementId,
        int quantity,
        double averagePurchaseCost,
        double averageSalePrice,
        double totalPurchaseValue,
        double totalSaleValue,
        double marginAmount,
        int quantityAfter,
        List<LayerPortion> layers) {

    public record LayerPortion(Long layerId, int quantity, double unitPurchaseCost, double unitSalePrice) {
    }
}
