package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.StockRequest;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface StockRequestRepository extends GenericRepository<StockRequest, Long> {
    Page<StockRequest> findByCollector(String collector, Pageable pageable);

    Page<StockRequest> findByCollectorOrderByIdDesc(String collector, Pageable pageable);

    Page<StockRequest> findByStatus(StockRequestStatus status, Pageable pageable);

    Page<StockRequest> findByStatusIn(List<StockRequestStatus> statuses, Pageable pageable);

    Page<StockRequest> findByStatusInOrderByIdDesc(List<StockRequestStatus> statuses, Pageable pageable);

    @Query("SELECT MAX(s.id) FROM StockRequest s")
    Long findMaxId();

    @Query("SELECT new com.optimize.elykia.core.dto.StockRequestExportDTO(i.itemName, SUM(i.quantity)) " +
            "FROM StockRequest s JOIN s.items i " +
            "WHERE s.status IN :statuses " +
            "AND (:collector IS NULL OR s.collector = :collector) " +
            "AND (:startDate IS NULL OR s.deliveryDate >= :startDate) " +
            "AND (:endDate IS NULL OR s.deliveryDate <= :endDate) " +
            "GROUP BY i.itemName " +
            "ORDER BY i.itemName")
    List<com.optimize.elykia.core.dto.StockRequestExportDTO> findAggregatedStockRequests(
            @org.springframework.data.repository.query.Param("startDate") java.time.LocalDate startDate,
            @org.springframework.data.repository.query.Param("endDate") java.time.LocalDate endDate,
            @org.springframework.data.repository.query.Param("collector") String collector,
            @org.springframework.data.repository.query.Param("statuses") List<StockRequestStatus> statuses);
}
