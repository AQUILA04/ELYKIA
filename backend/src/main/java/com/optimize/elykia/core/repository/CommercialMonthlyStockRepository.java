package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.dto.CommercialStockItemDto;
import com.optimize.elykia.core.entity.CommercialMonthlyStock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommercialMonthlyStockRepository extends GenericRepository<CommercialMonthlyStock, Long> {
    Optional<CommercialMonthlyStock> findByCollectorAndMonthAndYear(String collector, Integer month, Integer year);

    @Query("SELECT new com.optimize.elykia.core.dto.CommercialStockItemDto(" +
           "i.article.id, " +
           "i.article.name, " +
           "i.article.type || ': ' || i.article.marque || ' ' || i.article.model, " +
           "i.article.sellingPrice, " +
           "i.article.creditSalePrice, " +
           "i.quantityRemaining) " +
           "FROM CommercialMonthlyStock s " +
           "JOIN s.items i " +
           "WHERE s.collector = :collector " +
           "AND s.month = :month " +
           "AND s.year = :year " +
           "AND i.quantityRemaining > 0")
    List<CommercialStockItemDto> findAvailableItemsByCollector(
            @Param("collector") String collector,
            @Param("month") Integer month,
            @Param("year") Integer year);
}
