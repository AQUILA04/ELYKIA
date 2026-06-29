package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.dto.stock.FifoConsumptionResult;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class LegacyStockValuationAdapterTest {

    private final LegacyStockValuationAdapter adapter = new LegacyStockValuationAdapter();

    @Test
    void consumeUsesCatalogPurchasePrice() {
        Articles article = articleWith(10, 200.0);

        FifoConsumptionResult result = adapter.consume(
                article, 5, null, "STOCK_REQUEST", 1L);

        assertEquals(1000.0, result.getTotalCost());
        assertEquals(200.0, result.getAverageUnitCost());
        assertEquals(5, result.getQuantityConsumed());
    }

    @Test
    void getStockValuationUsesPurchasePriceTimesQuantity() {
        Articles article = articleWith(12, 250.0);
        assertEquals(3000.0, adapter.getStockValuation(article));
    }

    @Test
    void resolveEntryUnitPriceFallsBackToCatalogPrice() {
        Articles article = articleWith(5, 180.0);
        assertEquals(180.0, adapter.resolveEntryUnitPrice(article, null));
        assertEquals(215.0, adapter.resolveEntryUnitPrice(article, 215.0));
    }

    @Test
    void registerEntryReturnsNullWithoutCreatingLot() {
        Articles article = articleWith(3, 100.0);
        assertNull(adapter.registerEntry(
                article, 3, 100.0, ArticleStockLotSourceType.MIGRATION, null, null));
    }

    private static Articles articleWith(int qty, double purchasePrice) {
        Articles article = new Articles(1L);
        article.setStockQuantity(qty);
        article.setPurchasePrice(purchasePrice);
        return article;
    }
}
