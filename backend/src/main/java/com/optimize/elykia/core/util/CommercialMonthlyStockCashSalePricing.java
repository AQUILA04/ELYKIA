package com.optimize.elykia.core.util;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;

/**
 * Valorisation des ventes comptant sur le stock mensuel commercial.
 */
public final class CommercialMonthlyStockCashSalePricing {

    private CommercialMonthlyStockCashSalePricing() {
    }

    public static double resolveSaleUnitPrice(CreditArticles creditArticle) {
        if (creditArticle == null) {
            throw new CustomValidationException("Article de vente comptant introuvable.");
        }

        Double unitPrice = creditArticle.getUnitPrice();
        if (unitPrice != null && unitPrice > 0) {
            return unitPrice;
        }

        Articles article = creditArticle.getArticles();
        if (article != null && article.getSellingPrice() > 0) {
            return article.getSellingPrice();
        }

        String articleLabel = article != null ? article.getCommercialName() : "inconnu";
        throw new CustomValidationException(
                "Prix de vente comptant indisponible pour l'article : " + articleLabel);
    }

    public static void ensureCreditArticleUnitPrice(CreditArticles creditArticle, double saleUnitPrice) {
        if (creditArticle.getUnitPrice() == null || creditArticle.getUnitPrice() <= 0) {
            creditArticle.setUnitPrice(saleUnitPrice);
        }
    }

    public static void initializeStockItemPricingIfAbsent(
            CommercialMonthlyStockItem stockItem,
            double saleUnitPrice,
            Articles article) {
        if (stockItem.getWeightedAverageUnitPrice() == null || stockItem.getWeightedAverageUnitPrice() <= 0) {
            double roundedSalePrice = Math.ceil(saleUnitPrice);
            stockItem.setWeightedAverageUnitPrice(roundedSalePrice);
            stockItem.setLastUnitPrice(roundedSalePrice);
        }

        if (article == null) {
            return;
        }

        double purchasePrice = article.getPurchasePrice();
        if (purchasePrice > 0
                && (stockItem.getWeightedAveragePurchasePrice() == null
                || stockItem.getWeightedAveragePurchasePrice() <= 0)) {
            double roundedPurchasePrice = Math.ceil(purchasePrice);
            stockItem.setWeightedAveragePurchasePrice(roundedPurchasePrice);
            stockItem.setLastPurchasePrice(roundedPurchasePrice);
        }
    }

    public static void addMarginToStockItem(
            CommercialMonthlyStockItem stockItem,
            int quantity,
            double saleUnitPrice,
            double purchaseUnitPrice) {
        double currentMarge = stockItem.getTotalMargeValue() == null ? 0.0 : stockItem.getTotalMargeValue();
        stockItem.setTotalMargeValue(currentMarge + (quantity * (saleUnitPrice - purchaseUnitPrice)));
    }

    public static double applySoldValueAndMargin(
            CommercialMonthlyStockItem stockItem,
            int quantity,
            double saleUnitPrice) {
        double currentTotalSold = stockItem.getTotalSoldValue() == null ? 0.0 : stockItem.getTotalSoldValue();
        double lineSoldValue = quantity * saleUnitPrice;
        double newTotalSold = currentTotalSold + lineSoldValue;
        stockItem.setTotalSoldValue(newTotalSold);

        double purchasePmp = stockItem.getWeightedAveragePurchasePrice() == null
                ? 0.0
                : stockItem.getWeightedAveragePurchasePrice();
        addMarginToStockItem(stockItem, quantity, saleUnitPrice, purchasePmp);

        return newTotalSold;
    }
}
