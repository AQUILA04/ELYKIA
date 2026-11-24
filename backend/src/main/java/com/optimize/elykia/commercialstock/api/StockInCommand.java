package com.optimize.elykia.commercialstock.api;

import java.time.LocalDate;

/** Entrée de marchandise dans la position d'un commercial (sortie magasin validée). */
public record StockInCommand(
        String collector,
        Long articleId,
        StockActivityType activityType,
        int quantity,
        double unitPurchaseCost,
        Double salePrice,
        CommercialStockReferenceType referenceType,
        Long referenceId,
        String referenceCode,
        Long tontineSessionId,
        LocalDate accountingDate,
        String performedBy) {
}
