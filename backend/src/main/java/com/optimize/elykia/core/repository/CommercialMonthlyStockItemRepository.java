package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommercialMonthlyStockItemRepository extends GenericRepository<CommercialMonthlyStockItem, Long> {

    @Query("SELECT cmsi.weightedAverageUnitPrice FROM CommercialMonthlyStockItem cmsi " +
            "JOIN cmsi.monthlyStock cms " +
            "WHERE cmsi.article.id = :articleId " +
            "AND cms.month = :month " +
            "AND cms.year = :year " +
            "AND cms.collector = :collector")
    Double getUnitPriceByArticleId(@Param("articleId") Long articleId,
                                   @Param("month") Integer month,
                                   @Param("year") Integer year,
                                   @Param("collector") String collector);

    @Query("SELECT cmsi.quantityRemaining FROM CommercialMonthlyStockItem cmsi " +
            "JOIN cmsi.monthlyStock cms " +
            "WHERE cmsi.article.id = :articleId " +
            "AND cms.month = :month " +
            "AND cms.year = :year " +
            "AND cms.collector = :collector")
    Double getRemainingQuantityByArticleId(@Param("articleId") Long articleId,
                                           @Param("month") Integer month,
                                           @Param("year") Integer year,
                                           @Param("collector") String collector);

    @Query("SELECT cmsi.id FROM CommercialMonthlyStockItem cmsi " +
            "JOIN cmsi.monthlyStock cms " +
            "WHERE cmsi.article.id = :articleId " +
            "AND cms.month = :month " +
            "AND cms.year = :year " +
            "AND cms.collector = :collector")
    Long getIdByArticleId(@Param("articleId") Long articleId,
                          @Param("month") Integer month,
                          @Param("year") Integer year,
                          @Param("collector") String collector);
}
