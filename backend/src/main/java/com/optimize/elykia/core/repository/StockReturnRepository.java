package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.StockReturn;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StockReturnRepository extends GenericRepository<StockReturn, Long> {
    Page<StockReturn> findByCollector(String collector, Pageable pageable);
}
