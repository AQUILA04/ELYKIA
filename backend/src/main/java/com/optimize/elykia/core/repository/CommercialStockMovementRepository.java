package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.CommercialStockMovement;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

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
}
