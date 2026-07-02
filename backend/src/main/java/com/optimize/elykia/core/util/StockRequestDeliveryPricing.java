package com.optimize.elykia.core.util;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.StockRequestItem;
import com.optimize.elykia.core.entity.stock.StockTontineRequestItem;

/**
 * Prix figés à la livraison : prix de vente catalogue courant ;
 * prix d'achat FIFO (coût moyen consommé) ou catalogue en mode legacy.
 */
public final class StockRequestDeliveryPricing {

    private StockRequestDeliveryPricing() {
    }

    public static void applyAtDelivery(StockRequestItem item, Articles article,
            boolean fifoEnabled, double fifoAverageUnitCost) {
        item.setUnitPrice(article.getCreditSalePrice());
        item.setPurchasePrice(resolvePurchasePrice(article, fifoEnabled, fifoAverageUnitCost));
    }

    public static void applyAtDelivery(StockTontineRequestItem item, Articles article,
            boolean fifoEnabled, double fifoAverageUnitCost) {
        item.setUnitPrice(article.getCreditSalePrice());
        item.setPurchasePrice(resolvePurchasePrice(article, fifoEnabled, fifoAverageUnitCost));
    }

    private static double resolvePurchasePrice(Articles article, boolean fifoEnabled, double fifoAverageUnitCost) {
        return fifoEnabled ? fifoAverageUnitCost : article.getPurchasePrice();
    }
}
