package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.sale.domain.StockReturnItem;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockReturnRepository}.
 */
@Deprecated(since = "2.16.0", forRemoval = true)
public interface StockReturnItemRepository extends GenericRepository<StockReturnItem, Long> {
}
