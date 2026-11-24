package com.optimize.elykia.commercialstock.api;

/** Origine d'une couche FIFO de stock commercial. */
public enum CommercialStockLayerSourceType {
    STOCK_REQUEST,
    ACTIVITY_TRANSFER,
    LEGACY_MIGRATION,
    CANCEL_RESTORE
}
