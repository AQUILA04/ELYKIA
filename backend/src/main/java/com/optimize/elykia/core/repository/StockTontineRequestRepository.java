package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.StockTontineRequest;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface StockTontineRequestRepository extends GenericRepository<StockTontineRequest, Long> {
    List<StockTontineRequest> findByCollector(String collector);

    List<StockTontineRequest> findByStatus(StockRequestStatus status);

    @Query("SELECT s FROM StockTontineRequest s WHERE s.collector = :collector AND s.status = :status")
    List<StockTontineRequest> findByCollectorAndStatus(@Param("collector") String collector,
            @Param("status") StockRequestStatus status);

    // Méthodes ajoutées pour alignement avec StockRequestRepository
    Page<StockTontineRequest> findByCollectorOrderByIdDesc(String collector, Pageable pageable);

    Page<StockTontineRequest> findByStatusInOrderByIdDesc(Collection<StockRequestStatus> statuses, Pageable pageable);

    @Query("SELECT max(s.id) FROM StockTontineRequest s")
    Long findMaxId();

    @Query("SELECT new com.optimize.elykia.core.dto.StockRequestExportDTO(i.itemName, SUM(i.quantity)) " +
            "FROM StockTontineRequest s JOIN s.items i " +
            "WHERE s.status IN :statuses " +
            "AND (:collector IS NULL OR s.collector = :collector) " +
            "AND (:startDate IS NULL OR s.deliveryDate >= :startDate) " +
            "AND (:endDate IS NULL OR s.deliveryDate <= :endDate) " +
            "GROUP BY i.itemName " +
            "ORDER BY i.itemName")
    List<com.optimize.elykia.core.dto.StockRequestExportDTO> findAggregatedStockRequests(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            @Param("collector") String collector,
            @Param("statuses") List<StockRequestStatus> statuses);
}
