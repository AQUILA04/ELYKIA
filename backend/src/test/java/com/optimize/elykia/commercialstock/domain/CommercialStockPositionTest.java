package com.optimize.elykia.commercialstock.domain;

import com.optimize.elykia.commercialstock.api.CommercialSalePriceSource;
import com.optimize.elykia.commercialstock.api.CommercialStockLayerSourceType;
import com.optimize.elykia.commercialstock.api.StockActivityType;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNull;

class CommercialStockPositionTest {

    private static final LocalDateTime T1 = LocalDateTime.of(2026, 1, 1, 8, 0);
    private static final LocalDateTime T2 = LocalDateTime.of(2026, 2, 1, 8, 0);

    private CommercialStockPosition positionWithTwoLayers() {
        CommercialStockPosition position = CommercialStockPosition.open("com.a", 7L, StockActivityType.CREDIT);
        // Réception volontairement dans le désordre pour vérifier l'ordre FIFO par acquiredAt.
        position.receive(1, 4500, 6000.0, CommercialStockLayerSourceType.STOCK_REQUEST, 2L, T2);
        position.receive(2, 4000, 5000.0, CommercialStockLayerSourceType.STOCK_REQUEST, 1L, T1);
        return position;
    }

    @Test
    void consume_traversesLayersInFifoOrderWithExactPurchaseCost() {
        CommercialStockPosition position = positionWithTwoLayers();

        ConsumptionPlan plan = position.consume(3, CommercialSalePriceSource.LAYER_FIFO, null);

        assertEquals(2, plan.lines().size());
        assertEquals(12_500.0, plan.totalPurchaseValue(), 0.0001);
        assertEquals(4_166.6667, plan.averagePurchaseCost(), 0.001);
        assertEquals(2 * 5000.0 + 6000.0, plan.totalSaleValue(), 0.0001);
        assertEquals(plan.totalSaleValue() - 12_500.0, plan.marginAmount(), 0.0001);
        assertEquals(0, position.getQuantityOnHand());
        assertNull(position.getWeightedAvgPurchaseCost());
    }

    @Test
    void consume_rejectsQuantityAboveStockWithoutMutatingLayers() {
        CommercialStockPosition position = positionWithTwoLayers();

        assertThrows(InsufficientCommercialStockException.class,
                () -> position.consume(4, CommercialSalePriceSource.LAYER_FIFO, null));

        assertEquals(3, position.getQuantityOnHand());
        assertEquals(3, position.getLayers().stream().mapToInt(CommercialStockLayer::getQuantityRemaining).sum());
    }

    @Test
    void consume_currentCatalogPriceKeepsLayerPurchaseCost() {
        CommercialStockPosition position = positionWithTwoLayers();

        ConsumptionPlan plan = position.consume(3, CommercialSalePriceSource.CURRENT_CATALOG, 7000.0);

        assertEquals(21_000.0, plan.totalSaleValue(), 0.0001);
        assertEquals(12_500.0, plan.totalPurchaseValue(), 0.0001);
    }

    @Test
    void revaluateSalePrice_neverChangesPurchaseCost() {
        CommercialStockPosition position = positionWithTwoLayers();

        int revalued = position.revaluateSalePrice(8000.0);

        assertEquals(3, revalued);
        position.getLayers().forEach(layer -> assertEquals(8000.0, layer.getEffectiveSalePrice(), 0.0001));
        assertEquals(4000.0, position.getLayers().get(1).getUnitPurchaseCost(), 0.0001);
        assertEquals(4500.0, position.getLayers().get(0).getUnitPurchaseCost(), 0.0001);
        assertEquals(5000.0, position.getLayers().get(1).getInitialSalePrice(), 0.0001);
    }

    @Test
    void restoreToLayer_returnsExactQuantitiesAndRejectsOverflow() {
        CommercialStockPosition position = positionWithTwoLayers();
        ConsumptionPlan plan = position.consume(2, CommercialSalePriceSource.LAYER_FIFO, null);
        ConsumptionLine line = plan.lines().get(0);

        position.restoreToLayer(line.layer(), 2);

        assertEquals(3, position.getQuantityOnHand());
        assertThrows(IllegalStateException.class, () -> position.restoreToLayer(line.layer(), 1));
    }

    @Test
    void receive_rejectsNonPositiveQuantity() {
        CommercialStockPosition position = CommercialStockPosition.open("com.a", 7L, StockActivityType.TONTINE);
        assertThrows(IllegalArgumentException.class,
                () -> position.receive(0, 100, 150.0, CommercialStockLayerSourceType.STOCK_REQUEST, null, null));
    }

    @Test
    void weightedAverageCostFollowsOpenLayers() {
        CommercialStockPosition position = positionWithTwoLayers();
        assertEquals((2 * 4000.0 + 4500.0) / 3, position.getWeightedAvgPurchaseCost(), 0.0001);
    }
}
