package com.optimize.elykia.commercialstock.api;

/** Synthèse par commercial et activité sur une période (vue équipe unifiée Crédit / Tontine). */
public record CommercialStockTeamRowView(
        String collector,
        StockActivityType activityType,
        int openingQuantity,
        int inQuantity,
        int soldQuantity,
        int returnedQuantity,
        int transferNetQuantity,
        int debtQuantity,
        int closingQuantity,
        double soldValue,
        double realizedMargin) {
}
