package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.sale.domain.CommercialStockMovement;
import com.optimize.elykia.sale.domain.CommercialStockMovementType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockLedgerEntryRepository}.
 */
@Deprecated(since = "2.16.0", forRemoval = true)
public interface CommercialStockMovementRepository extends GenericRepository<CommercialStockMovement, Long> {

    List<CommercialStockMovement> findByStockItem_IdOrderByOperationDateDesc(Long stockItemId);

    List<CommercialStockMovement> findByCreditIdOrderByOperationDateDesc(Long creditId);

    List<CommercialStockMovement> findByCollectorAndMovementTypeOrderByOperationDateDesc(
            String collector, CommercialStockMovementType type);

    @Query("SELECT m FROM CommercialStockMovement m " +
            "WHERE m.collector = :collector " +
            "AND m.operationDate BETWEEN :startDate AND :endDate " +
            "ORDER BY m.operationDate ASC")
    List<CommercialStockMovement> findTimelineByCollector(
            @Param("collector") String collector,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT new com.optimize.elykia.sale.web.dto.CommercialStockDashboardExportDTO(" +
            "CONCAT(a.type, ': ', a.marque, ' ', a.model, ' ', a.name), " +
            "COALESCE(m.unitSalePrice, 0.0), " +
            "0L, SUM(m.quantityMoved), 0L, SUM(m.quantityMoved * COALESCE(m.unitSalePrice, 0.0)), " +
            "a.type, a.marque, a.model, a.name) " +
            "FROM CommercialStockMovement m JOIN m.article a " +
            "WHERE m.movementType IN :types " +
            "AND (:#{#collector == null} = true OR m.collector = :collector) " +
            "AND m.operationDate >= :startDate " +
            "AND m.operationDate <= :endDate " +
            "GROUP BY a.type, a.marque, a.model, a.name, m.unitSalePrice " +
            "ORDER BY a.type, a.marque, a.model, a.name")
    List<com.optimize.elykia.sale.web.dto.CommercialStockDashboardExportDTO> findAggregatedSalesByPeriod(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            @Param("collector") String collector,
            @Param("types") List<CommercialStockMovementType> types);
}
