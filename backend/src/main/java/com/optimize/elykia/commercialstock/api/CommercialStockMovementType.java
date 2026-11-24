package com.optimize.elykia.commercialstock.api;

/** Type de mouvement du ledger de stock commercial. */
public enum CommercialStockMovementType {
    STOCK_IN,
    CREDIT_SALE,
    TONTINE_DELIVERY,
    RETURN,
    SALE_CANCELLATION,
    DEBT_WRITE_OFF,
    DEBT_REVERSAL,
    ACTIVITY_TRANSFER_OUT,
    ACTIVITY_TRANSFER_IN,
    PRICE_REVALUATION,
    ADJUSTMENT
}
