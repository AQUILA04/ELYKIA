package com.optimize.elykia.core.util;

import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CommercialMonthlyStockCashSalePricingTest {

    @Test
    void resolvesUnitPriceFromCreditArticleFirst() {
        CreditArticles line = lineWithArticle(250.0, 500.0);
        line.setUnitPrice(300.0);

        assertEquals(300.0, CommercialMonthlyStockCashSalePricing.resolveSaleUnitPrice(line));
    }

    @Test
    void fallsBackToSellingPriceWhenUnitPriceMissing() {
        CreditArticles line = lineWithArticle(250.0, 500.0);
        line.setUnitPrice(0.0);

        assertEquals(250.0, CommercialMonthlyStockCashSalePricing.resolveSaleUnitPrice(line));
    }

    @Test
    void rejectsWhenNoPriceAvailable() {
        CreditArticles line = lineWithArticle(0.0, 0.0);
        line.setUnitPrice(null);

        assertThrows(Exception.class, () -> CommercialMonthlyStockCashSalePricing.resolveSaleUnitPrice(line));
    }

    @Test
    void initializesStockItemPricingAndSoldValueForCashOnlySale() {
        CommercialMonthlyStockItem stockItem = new CommercialMonthlyStockItem();
        Articles article = new Articles();
        article.setPurchasePrice(200.0);

        CommercialMonthlyStockCashSalePricing.initializeStockItemPricingIfAbsent(stockItem, 250.0, article);
        double newTotalSold = CommercialMonthlyStockCashSalePricing.applySoldValueAndMargin(stockItem, 10, 250.0);

        assertEquals(250.0, stockItem.getWeightedAverageUnitPrice());
        assertEquals(200.0, stockItem.getWeightedAveragePurchasePrice());
        assertEquals(2_500.0, newTotalSold);
        assertEquals(500.0, stockItem.getTotalMargeValue());
    }

    @Test
    void addMarginToStockItemAccumulatesMarginNotCost() {
        CommercialMonthlyStockItem stockItem = new CommercialMonthlyStockItem();
        stockItem.setTotalMargeValue(100.0);

        CommercialMonthlyStockCashSalePricing.addMarginToStockItem(stockItem, 5, 350.0, 200.0);

        assertEquals(850.0, stockItem.getTotalMargeValue());
    }

    private static CreditArticles lineWithArticle(double sellingPrice, double creditSalePrice) {
        Articles article = new Articles();
        article.setName("Bonita 250g");
        article.setSellingPrice(sellingPrice);
        article.setCreditSalePrice(creditSalePrice);

        CreditArticles line = new CreditArticles();
        line.setArticles(article);
        return line;
    }
}
