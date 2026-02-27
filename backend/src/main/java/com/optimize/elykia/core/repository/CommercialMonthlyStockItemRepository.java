package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.CommercialMonthlyStockItem;
import org.springframework.data.jpa.repository.Query;

public interface CommercialMonthlyStockItemRepository extends GenericRepository<CommercialMonthlyStockItem, Long> {

    @Query(value = "SELECT cmsi.weightedAverageUnitPrice  FROM CommercialMonthlyStockItem cmsi JOIN CommercialMonthlyStock cms ON cmsi.monthlyStock.id = cms.id WHERE cmsi.article.id = :articleId AND cms.month = :month AND cms.year = :year AND cms.collector = :collector")
    Double getUnitPriceByArticleId(Long articleId, Integer month, Integer year, String collector);

    @Query(value = "SELECT cmsi.quantityRemaining  FROM CommercialMonthlyStockItem cmsi JOIN CommercialMonthlyStock cms ON cmsi.monthlyStock.id = cms.id WHERE cmsi.article.id = :articleId AND cms.month = :month AND cms.year = :year AND cms.collector = :collector")
    Double getRemainingQuantityByArticleId(Long articleId, Integer month, Integer year, String collector);
}
