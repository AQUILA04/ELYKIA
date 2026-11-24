package com.optimize.elykia.commercialstock.domain;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.commercialstock.api.StockActivityType;

/** Quantité demandée supérieure au stock détenu par le commercial. */
public class InsufficientCommercialStockException extends CustomValidationException {

    public InsufficientCommercialStockException(String collector, Long articleId, StockActivityType activityType,
                                                int available, int requested) {
        super("Stock commercial insuffisant (" + activityType + ") pour " + collector + ", article " + articleId
                + " : disponible " + available + ", demandé " + requested);
    }
}
