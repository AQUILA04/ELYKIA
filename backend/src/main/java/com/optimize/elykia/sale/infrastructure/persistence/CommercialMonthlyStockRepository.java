package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.sale.web.dto.CommercialStockItemDto;
import com.optimize.elykia.sale.domain.CommercialMonthlyStock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockPositionRepository}.
 */
@Deprecated(since = "2.16.0", forRemoval = true)
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

    @Query("SELECT new com.optimize.elykia.sale.web.dto.CommercialStockItemDto(" +
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

    @Query("""
            SELECT DISTINCT s FROM CommercialMonthlyStock s
            LEFT JOIN FETCH s.items
            WHERE s.id = :id
            """)
    Optional<CommercialMonthlyStock> findByIdWithItems(@Param("id") Long id);

    /** Stocks d'un mois avec leurs articles, en une requête (vue équipe). */
    @Query("""
            SELECT DISTINCT s FROM CommercialMonthlyStock s
            LEFT JOIN FETCH s.items
            WHERE s.month = :month AND s.year = :year
            """)
    List<CommercialMonthlyStock> findWithItemsByMonthAndYear(@Param("month") Integer month,
            @Param("year") Integer year);

    /**
     * Mois clôturés avec un reste physique et sans dette marchandise active : à régulariser.
     * Clôturé = mois antérieur au mois courant.
     */
    @Query("""
            SELECT DISTINCT s FROM CommercialMonthlyStock s
            LEFT JOIN FETCH s.items
            WHERE (s.year < :year OR (s.year = :year AND s.month < :month))
              AND EXISTS (SELECT 1 FROM CommercialMonthlyStockItem i
                          WHERE i.monthlyStock = s AND i.quantityRemaining > 0)
              AND NOT EXISTS (SELECT 1 FROM com.optimize.elykia.sale.domain.DebtDocument d
                              WHERE d.monthlyStock = s
                                AND d.debtType = com.optimize.elykia.sale.domain.DebtType.MERCHANDISE
                                AND d.status <> com.optimize.elykia.sale.domain.DebtStatus.CANCELLED)
            """)
    List<CommercialMonthlyStock> findClosedWithRemainingAndNoDebt(@Param("month") Integer month,
            @Param("year") Integer year);

    default CommercialMonthlyStock getCommercialMonthStock(String commercialUsername) {
        LocalDate currentDate = LocalDate.now();
        return findByCollectorAndMonthAndYear(commercialUsername, currentDate.getMonthValue(), currentDate.getYear())
                .orElseThrow(() -> new CustomValidationException("Aucun stock trouvé pour ce commercial ce mois-ci."));
    }
}
