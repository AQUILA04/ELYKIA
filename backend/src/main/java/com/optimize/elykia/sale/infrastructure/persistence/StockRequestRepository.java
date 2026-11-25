package com.optimize.elykia.sale.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.sale.domain.StockRequest;
import com.optimize.elykia.sale.domain.StockRequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.infrastructure.persistence.CommercialStockRequestRepository}.
 */
@Deprecated(since = "2.16.0", forRemoval = true)
public interface StockRequestRepository extends GenericRepository<StockRequest, Long> {
    Page<StockRequest> findByCollector(String collector, Pageable pageable);

    Page<StockRequest> findByCollectorOrderByIdDesc(String collector, Pageable pageable);

    Page<StockRequest> findByStatus(StockRequestStatus status, Pageable pageable);

    Page<StockRequest> findByStatusIn(List<StockRequestStatus> statuses, Pageable pageable);

    Page<StockRequest> findByStatusInOrderByIdDesc(List<StockRequestStatus> statuses, Pageable pageable);

    List<StockRequest> findByStatusAndRequestDateBefore(StockRequestStatus status, LocalDate date);

    @Modifying
    @Query("UPDATE StockRequest s SET s.status = :newStatus WHERE s.status = :oldStatus AND s.requestDate < :threshold")
    int bulkUpdateStatusBeforeDate(
            @Param("oldStatus") StockRequestStatus oldStatus,
            @Param("newStatus") StockRequestStatus newStatus,
            @Param("threshold") LocalDate threshold);

    @Query("SELECT MAX(s.id) FROM StockRequest s")
    Long findMaxId();

    @Query("SELECT new com.optimize.elykia.sale.web.dto.StockRequestExportDTO(" +
            "CONCAT(a.type, ': ', a.marque, ' ', a.model, ' ', a.name), " +
            "SUM(i.quantity), i.unitPrice, SUM(i.quantity * COALESCE(i.unitPrice, 0.0)), " +
            "a.type, a.marque, a.model, a.name) " +
            "FROM StockRequest s JOIN s.items i JOIN i.article a " +
            "WHERE s.status IN :statuses " +
            "AND (:#{#collector == null} = true OR s.collector = :collector) " +
            "AND (:#{#startDate == null} = true OR s.deliveryDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.deliveryDate <= :endDate) " +
            "AND (:#{#requestIds == null || #requestIds.isEmpty()} = true OR s.id IN :requestIds) " +
            "GROUP BY a.type, a.marque, a.model, a.name, i.unitPrice " +
            "ORDER BY a.type, a.marque, a.model, a.name")
    List<com.optimize.elykia.sale.web.dto.StockRequestExportDTO> findAggregatedStockRequests(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            @Param("collector") String collector,
            @Param("statuses") List<StockRequestStatus> statuses,
            @Param("requestIds") List<Long> requestIds);

    @Query("SELECT new com.optimize.elykia.sale.web.dto.StockRequestListDto(" +
            "s.id, s.reference, s.collector, s.requestDate, s.validationDate, s.deliveryDate, s.status) " +
            "FROM StockRequest s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR COALESCE(s.deliveryDate, s.requestDate) >= :startDate) " +
            "AND (:#{#endDate == null} = true OR COALESCE(s.deliveryDate, s.requestDate) <= :endDate) " +
            "ORDER BY s.id DESC")
    Page<com.optimize.elykia.sale.web.dto.StockRequestListDto> findFilteredList(
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StockRequest s WHERE s.id = :id")
    java.util.Optional<StockRequest> findByIdForUpdate(@Param("id") Long id);

    java.util.Optional<StockRequest> findByCredit_Id(Long creditId);

    @Query("SELECT s.id, c.reference FROM StockRequest s JOIN s.credit c WHERE s.id IN :ids")
    List<Object[]> findCashSaleReferences(@Param("ids") List<Long> ids);

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
