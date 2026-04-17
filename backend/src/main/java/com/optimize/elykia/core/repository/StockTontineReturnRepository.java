package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.stock.StockTontineReturn;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

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
}
