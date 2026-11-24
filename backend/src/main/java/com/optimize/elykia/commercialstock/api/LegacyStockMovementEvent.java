package com.optimize.elykia.commercialstock.api;

import java.time.LocalDate;

/**
 * Événement publié par les modules legacy (`sale`, `tontine`) à chaque mutation de leur stock commercial,
 * pour tenir le ledger continu à jour (double écriture) pendant la transition. Traité après commit.
 */
public record LegacyStockMovementEvent(
        Kind kind,
        StockActivityType activityType,
        String collector,
        Long articleId,
        int quantity,
        Double unitPurchaseCost,
        Double unitSalePrice,
        CommercialStockReferenceType referenceType,
        Long referenceId,
        String referenceCode,
        Long tontineSessionId,
        LocalDate accountingDate,
        String performedBy) {

    public enum Kind {
        STOCK_IN,
        SALE,
        RETURN,
        SALE_CANCELLATION
    }
}
