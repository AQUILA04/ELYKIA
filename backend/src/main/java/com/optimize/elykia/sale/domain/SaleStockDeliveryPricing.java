package com.optimize.elykia.sale.domain;

import com.optimize.elykia.inventory.domain.Articles;

/**
 * Prix figés à la livraison d'une demande de stock commercial : prix de vente crédit courant ;
 * prix d'achat FIFO (coût moyen consommé) ou catalogue en mode legacy.
 */
public final class SaleStockDeliveryPricing {

    private SaleStockDeliveryPricing() {
    }

    public static void applyAtDelivery(StockRequestItem item, Articles article,
            boolean fifoEnabled, double fifoAverageUnitCost) {
        item.setUnitPrice(article.getCreditSalePrice());
        item.setPurchasePrice(fifoEnabled ? fifoAverageUnitCost : article.getPurchasePrice());
    }
}
