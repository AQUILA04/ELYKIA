package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.StockTontineReturn;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StockTontineReturnRepository extends GenericRepository<StockTontineReturn, Long> {
    List<StockTontineReturn> findByCollector(String collector);
    
    // Ajout méthode paginée
    Page<StockTontineReturn> findByCollector(String collector, Pageable pageable);

    List<StockTontineReturn> findByStatus(StockReturnStatus status);
    
    // Ajout méthode paginée par statut
    Page<StockTontineReturn> findByStatus(StockReturnStatus status, Pageable pageable);
    
    // Ajout méthode paginée par statut IN
    Page<StockTontineReturn> findByStatusIn(List<StockReturnStatus> statuses, Pageable pageable);

    @Query("SELECT s FROM StockTontineReturn s WHERE s.collector = :collector AND s.status = :status")
    List<StockTontineReturn> findByCollectorAndStatus(@Param("collector") String collector, @Param("status") StockReturnStatus status);

    @Query("SELECT new com.optimize.elykia.core.dto.stock.StockTontineReturnListDto(" +
            "s.id, s.returnDate, s.collector, s.status) " +
            "FROM StockTontineReturn s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR s.receivedDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.receivedDate <= :endDate) " +
            "ORDER BY s.id DESC")
    Page<com.optimize.elykia.core.dto.stock.StockTontineReturnListDto> findFilteredList(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") List<StockReturnStatus> statuses,
            Pageable pageable);

    @Query("SELECT DISTINCT s FROM StockTontineReturn s " +
            "LEFT JOIN FETCH s.items i " +
            "LEFT JOIN FETCH i.article " +
            "WHERE s.id = :id")
    Optional<StockTontineReturn> findByIdWithItems(@Param("id") Long id);

    @Query("SELECT s FROM StockTontineReturn s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR s.receivedDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.receivedDate <= :endDate) " +
            "ORDER BY s.id DESC")
    Page<StockTontineReturn> findFiltered(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") List<StockReturnStatus> statuses,
            Pageable pageable);

    @Query("SELECT s.status, COUNT(s) FROM StockTontineReturn s WHERE " +
            "(:#{#collector == null} = true OR s.collector = :collector) " +
            "AND s.status IN :statuses " +
            "AND (:#{#startDate == null} = true OR s.receivedDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.receivedDate <= :endDate) " +
            "GROUP BY s.status")
    List<Object[]> countByStatusFiltered(
            @Param("collector") String collector,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") List<StockReturnStatus> statuses);

    @Query("SELECT new com.optimize.elykia.core.dto.StockRequestExportDTO(" +
            "CONCAT(a.type, ': ', a.marque, ' ', a.model, ' ', a.name), " +
            "SUM(i.quantity), COALESCE(a.sellingPrice, 0.0), SUM(i.quantity * COALESCE(a.sellingPrice, 0.0)), " +
            "a.type, a.marque, a.model, a.name) " +
            "FROM StockTontineReturn s JOIN s.items i JOIN i.article a " +
            "WHERE s.status = :status " +
            "AND (:#{#collector == null} = true OR s.collector = :collector) " +
            "AND (:#{#startDate == null} = true OR s.receivedDate >= :startDate) " +
            "AND (:#{#endDate == null} = true OR s.receivedDate <= :endDate) " +
            "GROUP BY a.type, a.marque, a.model, a.name, a.sellingPrice " +
            "ORDER BY a.type, a.marque, a.model, a.name")
    List<com.optimize.elykia.core.dto.StockRequestExportDTO> findAggregatedStockReturns(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("collector") String collector,
            @Param("status") StockReturnStatus status);
}
