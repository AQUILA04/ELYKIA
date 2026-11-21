package com.optimize.elykia.sale.api;

import com.optimize.elykia.inventory.domain.Articles;
import com.optimize.elykia.inventory.domain.SalePackMode;
import com.optimize.elykia.sale.web.dto.SaleLineQuote;

/**
 * SPI port decoupling {@code sale} warehouse cash-sale pricing from the cross-channel CashSalePricingService.
 */
public interface WarehouseCashSalePricingPort {

    SaleLineQuote quoteWarehouse(
            Articles article,
            SalePackMode mode,
            Integer packCount,
            Integer unitsPerPack,
            Integer unitQuantity);
}
