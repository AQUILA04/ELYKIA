package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.sale.domain.StockRequestItem;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockRequestRepository}.
 */
@Deprecated(since = "2.16.0", forRemoval = true)
public interface StockRequestItemRepository extends GenericRepository<StockRequestItem, Long> {
}
