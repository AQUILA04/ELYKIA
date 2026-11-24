package com.optimize.elykia.commercialstock.api;

import java.time.LocalDate;

/**
 * Sortie FIFO de stock commercial (vente, livraison tontine, retour magasin, mise en dette…).
 * Si {@code backdatedReason} est renseigné, la date comptable peut précéder la saisie (régularisation antidatée).
 */
public record ConsumeStockCommand(
        String collector,
        Long articleId,
        StockActivityType activityType,
        CommercialStockMovementType movementType,
        int quantity,
        CommercialSalePriceSource priceSource,
        Double catalogPrice,
        CommercialStockReferenceType referenceType,
        Long referenceId,
        String referenceCode,
        Long tontineSessionId,
        LocalDate accountingDate,
        String backdatedReason,
        String performedBy) {
}
