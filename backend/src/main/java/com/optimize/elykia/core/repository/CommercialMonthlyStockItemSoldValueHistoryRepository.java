package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.dto.stock.CreditSoldAmountOnStockProjection;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItemSoldValueHistory;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CommercialMonthlyStockItemSoldValueHistoryRepository
        extends GenericRepository<CommercialMonthlyStockItemSoldValueHistory, Long> {

    List<CommercialMonthlyStockItemSoldValueHistory> findByStockItem_IdOrderByCreatedDateDesc(Long stockItemId);

    @Query("""
            SELECT h.creditId AS creditId, SUM(h.deltaValue) AS soldValue
            FROM CommercialMonthlyStockItemSoldValueHistory h
            WHERE h.stockItem.id IN :stockItemIds
              AND h.creditId IS NOT NULL
            GROUP BY h.creditId
            """)
    List<CreditSoldAmountOnStockProjection> sumSoldValueByCreditForStockItems(
            @Param("stockItemIds") Collection<Long> stockItemIds);
}
