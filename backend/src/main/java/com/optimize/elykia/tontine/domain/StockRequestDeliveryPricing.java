package com.optimize.elykia.tontine.domain;

import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.sale.domain.SaleStockDeliveryPricing;
import com.optimize.elykia.sale.domain.StockRequestItem;

/**
 * Prix figés à la livraison : prix de vente catalogue courant ;
 * prix d'achat FIFO (coût moyen consommé) ou catalogue en mode legacy.
 */
public final class StockRequestDeliveryPricing {

    private StockRequestDeliveryPricing() {
    }

    public static void applyAtDelivery(StockRequestItem item, Articles article,
            boolean fifoEnabled, double fifoAverageUnitCost) {
        SaleStockDeliveryPricing.applyAtDelivery(item, article, fifoEnabled, fifoAverageUnitCost);
    }

    public static void applyAtDelivery(StockTontineRequestItem item, Articles article,
            boolean fifoEnabled, double fifoAverageUnitCost) {
        // Tontine fige le prix de vente comptant (sellingPrice), pas le crédit
        item.setUnitPrice(article.getSellingPrice());
        item.setPurchasePrice(resolvePurchasePrice(article, fifoEnabled, fifoAverageUnitCost));
    }

    private static double resolvePurchasePrice(Articles article, boolean fifoEnabled, double fifoAverageUnitCost) {
        return fifoEnabled ? fifoAverageUnitCost : article.getPurchasePrice();
    }
}
