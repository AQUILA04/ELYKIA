package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.StockTontineRequest;
import com.optimize.elykia.core.enumaration.StockRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

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

    @Query("SELECT new com.optimize.elykia.core.dto.StockRequestExportDTO(" +
            "COALESCE(i.itemName, CONCAT(a.type, ': ', a.marque, ' ', a.model, ' ', a.name)), " +
            "SUM(i.quantity), COALESCE(i.unitPrice, 0.0), SUM(i.quantity * COALESCE(i.unitPrice, 0.0)), " +
            "a.type, a.marque, a.model, a.name) " +
            "FROM StockTontineRequest s JOIN s.items i LEFT JOIN i.article a " +
            "WHERE s.status IN :statuses " +
            "AND (:#{#collector == null} = true OR s.collector = :collector) " +
            "AND (:#{#startDate == null} = true OR s.deliveryDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.deliveryDate <= :endDate) " +
            "GROUP BY COALESCE(i.itemName, CONCAT(a.type, ': ', a.marque, ' ', a.model, ' ', a.name)), i.unitPrice, " +
            "a.type, a.marque, a.model, a.name " +
            "ORDER BY COALESCE(i.itemName, CONCAT(a.type, ': ', a.marque, ' ', a.model, ' ', a.name))")
    List<com.optimize.elykia.core.dto.StockRequestExportDTO> findAggregatedStockRequests(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            @Param("collector") String collector,
            @Param("statuses") List<StockRequestStatus> statuses);

    @Query("SELECT new com.optimize.elykia.core.dto.stock.StockTontineRequestListDto(" +
            "s.id, s.reference, s.collector, s.requestDate, s.validationDate, s.deliveryDate, s.status) " +
            "FROM StockTontineRequest s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR s.deliveryDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.deliveryDate <= :endDate) " +
            "ORDER BY s.id DESC")
    Page<com.optimize.elykia.core.dto.stock.StockTontineRequestListDto> findFilteredList(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") Collection<StockRequestStatus> statuses,
            Pageable pageable);

    @Query("SELECT DISTINCT s FROM StockTontineRequest s " +
            "LEFT JOIN FETCH s.items i " +
            "LEFT JOIN FETCH i.article " +
            "WHERE s.id = :id")
    Optional<StockTontineRequest> findByIdWithItems(@Param("id") Long id);

    @Query("SELECT s FROM StockTontineRequest s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR s.deliveryDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.deliveryDate <= :endDate) " +
            "ORDER BY s.id DESC")
    Page<StockTontineRequest> findFiltered(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") Collection<StockRequestStatus> statuses,
            Pageable pageable);

    @Query("SELECT s.status, COUNT(s) FROM StockTontineRequest s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR s.deliveryDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.deliveryDate <= :endDate) " +
            "GROUP BY s.status")
    List<Object[]> countByStatusFiltered(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") Collection<StockRequestStatus> statuses);
}
