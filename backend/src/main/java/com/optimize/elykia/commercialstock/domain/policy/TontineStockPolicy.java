package com.optimize.elykia.commercialstock.domain.policy;

import com.optimize.elykia.commercialstock.api.CommercialSalePriceSource;
import com.optimize.elykia.commercialstock.api.CommercialStockMovementType;
import com.optimize.elykia.commercialstock.api.StockActivityType;

public final class TontineStockPolicy implements StockActivityPolicy {

    public static final TontineStockPolicy INSTANCE = new TontineStockPolicy();

    private TontineStockPolicy() {
    }

    @Override
    public StockActivityType activityType() {
        return StockActivityType.TONTINE;
    }

    @Override
    public CommercialStockMovementType saleMovementType() {
        return CommercialStockMovementType.TONTINE_DELIVERY;
    }

    @Override
    public CommercialSalePriceSource defaultPriceSource() {
        return CommercialSalePriceSource.LAYER_FIFO;
    }

    @Override
    public boolean requiresTontineSessionContext() {
        return true;
    }
}
