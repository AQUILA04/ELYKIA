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
    Page<StockRequest> findByCollectorOrderByRequestDateDesc(String collector, Pageable pageable);
    Page<StockRequest> findByStatus(StockRequestStatus status, Pageable pageable);
    Page<StockRequest> findByStatusIn(List<StockRequestStatus> statuses, Pageable pageable);
    Page<StockRequest> findByStatusInOrderByRequestDateDesc(List<StockRequestStatus> statuses, Pageable pageable);

    @Query("SELECT MAX(s.id) FROM StockRequest s")
    Long findMaxId();
}
