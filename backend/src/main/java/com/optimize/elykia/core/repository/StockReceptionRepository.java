package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.BaseRepository;
import com.optimize.elykia.core.entity.StockReception;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface StockReceptionRepository extends BaseRepository<StockReception, Long, Long> {
    Page<StockReception> findByReceptionDateBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);
    
    Page<StockReception> findByReferenceContainingIgnoreCase(String reference, Pageable pageable);

    Page<StockReception> findByReceptionDate(LocalDate receptionDate, Pageable pageable);
    
    Page<StockReception> findByReferenceContainingIgnoreCaseAndReceptionDate(String reference, LocalDate receptionDate, Pageable pageable);
}
