package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.StockRequest;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface StockRequestRepository extends GenericRepository<StockRequest, Long> {
    Page<StockRequest> findByCollector(String collector, Pageable pageable);

    Page<StockRequest> findByCollectorOrderByIdDesc(String collector, Pageable pageable);

    Page<StockRequest> findByStatus(StockRequestStatus status, Pageable pageable);

    Page<StockRequest> findByStatusIn(List<StockRequestStatus> statuses, Pageable pageable);

    Page<StockRequest> findByStatusInOrderByIdDesc(List<StockRequestStatus> statuses, Pageable pageable);

    List<StockRequest> findByStatusAndRequestDateBefore(StockRequestStatus status, LocalDate date);

    @Query("SELECT MAX(s.id) FROM StockRequest s")
    Long findMaxId();

    @Query("SELECT new com.optimize.elykia.core.dto.StockRequestExportDTO(i.itemName, SUM(i.quantity), i.unitPrice, SUM(i.quantity * COALESCE(i.unitPrice, 0.0))) " +
            "FROM StockRequest s JOIN s.items i " +
            "WHERE s.status IN :statuses " +
            "AND (:#{#collector == null} = true OR s.collector = :collector) " +
            "AND (:#{#startDate == null} = true OR s.deliveryDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.deliveryDate <= :endDate) " +
            "GROUP BY i.itemName, i.unitPrice " +
            "ORDER BY i.itemName")
    List<com.optimize.elykia.core.dto.StockRequestExportDTO> findAggregatedStockRequests(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            @Param("collector") String collector,
            @Param("statuses") List<StockRequestStatus> statuses);
}
