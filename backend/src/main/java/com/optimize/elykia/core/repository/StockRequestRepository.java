package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.StockRequest;
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

    @Query("SELECT new com.optimize.elykia.core.dto.StockRequestExportDTO(" +
            "CONCAT(a.type, ': ', a.marque, ' ', a.model, ' ', a.name), " +
            "SUM(i.quantity), i.unitPrice, SUM(i.quantity * COALESCE(i.unitPrice, 0.0)), " +
            "a.type, a.marque, a.model, a.name) " +
            "FROM StockRequest s JOIN s.items i JOIN i.article a " +
            "WHERE s.status IN :statuses " +
            "AND (:#{#collector == null} = true OR s.collector = :collector) " +
            "AND (:#{#startDate == null} = true OR s.deliveryDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.deliveryDate <= :endDate) " +
            "GROUP BY a.type, a.marque, a.model, a.name, i.unitPrice " +
            "ORDER BY a.type, a.marque, a.model, a.name")
    List<com.optimize.elykia.core.dto.StockRequestExportDTO> findAggregatedStockRequests(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            @Param("collector") String collector,
            @Param("statuses") List<StockRequestStatus> statuses);

    @Query("SELECT new com.optimize.elykia.core.dto.stock.StockRequestListDto(" +
            "s.id, s.reference, s.collector, s.requestDate, s.validationDate, s.deliveryDate, s.status) " +
            "FROM StockRequest s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR COALESCE(s.deliveryDate, s.requestDate) >= :startDate) " +
            "AND (:#{#endDate == null} = true OR COALESCE(s.deliveryDate, s.requestDate) <= :endDate) " +
            "ORDER BY s.id DESC")
    Page<com.optimize.elykia.core.dto.stock.StockRequestListDto> findFilteredList(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") List<StockRequestStatus> statuses,
            Pageable pageable);

    @Query("SELECT DISTINCT s FROM StockRequest s " +
            "LEFT JOIN FETCH s.items i " +
            "LEFT JOIN FETCH i.article " +
            "WHERE s.id = :id")
    java.util.Optional<StockRequest> findByIdWithItems(@Param("id") Long id);

    @Query("SELECT s FROM StockRequest s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR COALESCE(s.deliveryDate, s.requestDate) >= :startDate) " +
            "AND (:#{#endDate == null} = true OR COALESCE(s.deliveryDate, s.requestDate) <= :endDate) " +
            "ORDER BY s.id DESC")
    Page<StockRequest> findFiltered(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") List<StockRequestStatus> statuses,
            Pageable pageable);

    @Query("SELECT s.status, COUNT(s) FROM StockRequest s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR COALESCE(s.deliveryDate, s.requestDate) >= :startDate) " +
            "AND (:#{#endDate == null} = true OR COALESCE(s.deliveryDate, s.requestDate) <= :endDate) " +
            "GROUP BY s.status")
    List<Object[]> countByStatusFiltered(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") List<StockRequestStatus> statuses);
}
