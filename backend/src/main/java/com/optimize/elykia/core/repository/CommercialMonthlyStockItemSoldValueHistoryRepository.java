package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItemSoldValueHistory;

import java.util.List;

public interface CommercialMonthlyStockItemSoldValueHistoryRepository
        extends GenericRepository<CommercialMonthlyStockItemSoldValueHistory, Long> {

    List<CommercialMonthlyStockItemSoldValueHistory> findByStockItem_IdOrderByCreatedDateDesc(Long stockItemId);
}
