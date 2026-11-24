package com.optimize.elykia.commercialstock.api;

/** Nature de l'objet métier à l'origine d'un mouvement. */
public enum CommercialStockReferenceType {
    STOCK_REQUEST,
    STOCK_RETURN,
    CREDIT,
    TONTINE_DELIVERY,
    DEBT_DOCUMENT,
    TRANSFER,
    PRICE_CHANGE,
    LEGACY_MIGRATION,
    MANUAL
}
