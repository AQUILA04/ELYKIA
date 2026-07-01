package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.dto.stock.FifoConsumptionResult;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.stock.ArticleStockLot;
import com.optimize.elykia.core.entity.stock.StockReceptionItem;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import com.optimize.elykia.core.enumaration.ArticleStockLotSourceType;
import jakarta.annotation.Nullable;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Comportement historique : pas de lots, valorisation via purchasePrice catalogue.
 */
@Component
public class LegacyStockValuationAdapter {

    /**
     * Mode legacy : aucun lot n'est créé. Les entrées magasin restent gérées via {@code Articles.stockQuantity}
     * et {@code Articles.purchasePrice} (voir {@link com.optimize.elykia.core.service.store.ArticlesService}).
     *
     * @return {@code null} — absence volontaire de lot ; les appelants ne doivent pas déréférencer le retour.
     */
    @Nullable
    public ArticleStockLot registerEntry(
            Articles article,
            int quantity,
            double unitPurchasePrice,
            ArticleStockLotSourceType sourceType,
            StockReceptionItem receptionItem,
            LocalDate entryDate) {
        return null;
    }

    public FifoConsumptionResult consume(
            Articles article,
            int quantity,
            ArticleStockLotMovementType movementType,
            String sourceType,
            Long sourceId) {
        double unitCost = article.getPurchasePrice();
        double totalCost = unitCost * quantity;
        return FifoConsumptionResult.builder()
                .totalCost(totalCost)
                .averageUnitCost(unitCost)
                .quantityConsumed(quantity)
                .build();
    }

    public double getStockValuation(Articles article) {
        int qty = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
        return qty * article.getPurchasePrice();
    }

    public double getEstimatedMargin(Articles article, double salePrice) {
        int qty = article.getStockQuantity() != null ? article.getStockQuantity() : 0;
        return qty * (salePrice - article.getPurchasePrice());
    }

    public double resolveEntryUnitPrice(Articles article, Double requestedUnitPrice) {
        if (requestedUnitPrice != null && requestedUnitPrice > 0) {
            return requestedUnitPrice;
        }
        return article.getPurchasePrice();
    }
}
