package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.StockReturn;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface StockReturnRepository extends GenericRepository<StockReturn, Long> {
    Page<StockReturn> findByCollector(String collector, Pageable pageable);

    Page<StockReturn> findByStatusIn(List<StockReturnStatus> statusList, Pageable pageable);

    boolean existsByReference(String reference);

    @Query("SELECT new com.optimize.elykia.core.dto.StockRequestExportDTO(CONCAT(a.type, ': ', a.marque, ' ', a.model, ' ', a.name), SUM(i.quantity), i.unitPrice) " +
            "FROM StockReturn s JOIN s.items i JOIN i.article a " +
            "WHERE s.status = :status " +
            "AND (:#{#collector == null} = true OR s.collector = :collector) " +
            "AND (:#{#startDate == null} = true OR s.returnDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.returnDate <= :endDate) " +
            "GROUP BY a.type, a.marque, a.model, a.name, i.unitPrice " +
            "ORDER BY a.name")
    List<com.optimize.elykia.core.dto.StockRequestExportDTO> findAggregatedStockReturns(
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            @Param("collector") String collector,
            @Param("status") StockReturnStatus status);

    @Query("SELECT s FROM StockReturn s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR s.returnDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.returnDate <= :endDate) " +
            "ORDER BY s.id DESC")
    Page<StockReturn> findFiltered(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") List<StockReturnStatus> statuses,
            Pageable pageable);

    @Query("SELECT s.status, COUNT(s) FROM StockReturn s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR s.returnDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.returnDate <= :endDate) " +
            "GROUP BY s.status")
    List<Object[]> countByStatusFiltered(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") List<StockReturnStatus> statuses);
}
