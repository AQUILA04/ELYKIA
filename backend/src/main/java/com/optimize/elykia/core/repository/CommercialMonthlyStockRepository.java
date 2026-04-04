package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.dto.CommercialStockItemDto;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CommercialMonthlyStockRepository extends GenericRepository<CommercialMonthlyStock, Long> {
    Optional<CommercialMonthlyStock> findByCollectorAndMonthAndYear(String collector, Integer month, Integer year);

    Page<CommercialMonthlyStock> findByCollectorAndMonthAndYearOrderByIdDesc(String collector, Integer month,
            Integer year, Pageable pageable);

    Page<CommercialMonthlyStock> findByMonthAndYearOrderByIdDesc(Integer month, Integer year, Pageable pageable);

    @Query("SELECT s FROM CommercialMonthlyStock s WHERE s.collector = :collector AND ((s.month < :month AND s.year = :year) OR s.year < :year) ORDER BY s.id DESC")
    Page<CommercialMonthlyStock> findByCollectorAndMonthNotAndYearNotOrderByIdDesc(String collector, Integer month,
            Integer year, Pageable pageable);
    @Query("SELECT s FROM CommercialMonthlyStock s WHERE (s.month < :month AND s.year = :year) OR s.year < :year ORDER BY s.id DESC")
    Page<CommercialMonthlyStock> findByMonthNotAndYearNotOrderByIdDesc(Integer month, Integer year, Pageable pageable);

    @Query("SELECT new com.optimize.elykia.core.dto.CommercialStockItemDto(" +
           "i.article.id, " +
           "i.article.name, " +
           "i.article.type || ': ' || i.article.marque || ' ' || i.article.model, " +
           "i.article.sellingPrice, " +
           "i.weightedAverageUnitPrice, " +
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

    @Query("""
            SELECT DISTINCT s FROM CommercialMonthlyStock s
            JOIN FETCH s.items i
            WHERE s.collector = :collector
            AND (s.year < :currentYear
                 OR (s.year = :currentYear AND s.month < :currentMonth))
            AND i.quantityRemaining > 0
            ORDER BY s.year DESC, s.month DESC
            """)
    List<CommercialMonthlyStock> findResidualStocksByCollector(
            @Param("collector") String collector,
            @Param("currentMonth") int currentMonth,
            @Param("currentYear") int currentYear);
}
