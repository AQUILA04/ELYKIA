package com.optimize.elykia.commercialstock.domain.policy;

import com.optimize.elykia.commercialstock.api.CommercialSalePriceSource;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.StockActivityType;

public final class CreditStockPolicy implements StockActivityPolicy {

    public static final CreditStockPolicy INSTANCE = new CreditStockPolicy();

    private CreditStockPolicy() {
    }

    @Override
    public StockActivityType activityType() {
        return StockActivityType.CREDIT;
    }

    @Override
    public CommercialStockMovementType saleMovementType() {
        return CommercialStockMovementType.CREDIT_SALE;
    }

    @Override
    public CommercialSalePriceSource defaultPriceSource() {
        return CommercialSalePriceSource.LAYER_FIFO;
    }

    @Override
    public boolean requiresTontineSessionContext() {
        return false;
    }
}
