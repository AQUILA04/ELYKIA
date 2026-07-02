package com.optimize.elykia.core.util;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.StockRequestItem;
import com.optimize.elykia.core.entity.stock.StockTontineRequestItem;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StockRequestDeliveryPricingTest {

    @Test
    void applyAtDelivery_legacy_usesCatalogPrices() {
        Articles article = article(80.0, 150.0);
        StockRequestItem item = itemWithPrices(100.0, 50.0);

        StockRequestDeliveryPricing.applyAtDelivery(item, article, false, 0.0);

        assertEquals(150.0, item.getUnitPrice());
        assertEquals(80.0, item.getPurchasePrice());
    }

    @Test
    void applyAtDelivery_fifo_usesCatalogSalePriceAndFifoCost() {
        Articles article = article(80.0, 150.0);
        StockTontineRequestItem item = tontineItemWithPrices(100.0, 50.0);

        StockRequestDeliveryPricing.applyAtDelivery(item, article, true, 92.5);

        assertEquals(150.0, item.getUnitPrice());
        assertEquals(92.5, item.getPurchasePrice());
    }

    private static Articles article(double purchasePrice, double creditSalePrice) {
        Articles article = new Articles();
        article.setPurchasePrice(purchasePrice);
        article.setCreditSalePrice(creditSalePrice);
        return article;
    }

    private static StockRequestItem itemWithPrices(double unitPrice, double purchasePrice) {
        StockRequestItem item = new StockRequestItem();
        item.setUnitPrice(unitPrice);
        item.setPurchasePrice(purchasePrice);
        return item;
    }

    private static StockTontineRequestItem tontineItemWithPrices(double unitPrice, double purchasePrice) {
        StockTontineRequestItem item = new StockTontineRequestItem();
        item.setUnitPrice(unitPrice);
        item.setPurchasePrice(purchasePrice);
        return item;
    }
}
