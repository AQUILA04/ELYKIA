package com.optimize.elykia.commercialstock.api;

/**
 * Balance d'un couple (commercial, article, activité) sur une période [startDate, endDate] :
 * equation de conservation opening + in - sold - returned - debt + transferNet + adjustmentNet == closing.
 */
public record CommercialStockPeriodRowView(
        String collector,
        Long articleId,
        StockActivityType activityType,
        int openingQuantity,
        int inQuantity,
        int soldQuantity,
        int returnedQuantity,
        int transferNetQuantity,
        int debtQuantity,
        int adjustmentNetQuantity,
        int closingQuantity,
        double soldValue,
        double purchaseCostOfSold,
        double realizedMargin,
        boolean hasBackdatedMovements) {
    public String commercialUsername() {
        return collector;
    }
}
