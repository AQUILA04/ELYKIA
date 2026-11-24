package com.optimize.elykia.commercialstock.api;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Ligne du ledger exposée en lecture (timeline des mouvements). */
public record CommercialStockMovementView(
        Long id,
        String collector,
        Long articleId,
        StockActivityType activityType,
        CommercialStockMovementType movementType,
        int deltaQuantity,
        int quantityBefore,
        int quantityAfter,
        Double unitPurchaseCost,
        Double unitSalePrice,
        Double marginAmount,
        CommercialStockReferenceType referenceType,
        Long referenceId,
        String referenceCode,
        LocalDate accountingDate,
        LocalDateTime occurredAt,
        boolean backdated,
        String performedBy) {
}
