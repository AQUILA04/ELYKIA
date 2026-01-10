package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.StockReturn;
import com.optimize.elykia.core.enumaration.StockReturnStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface StockReturnRepository extends GenericRepository<StockReturn, Long> {
    Page<StockReturn> findByCollector(String collector, Pageable pageable);

    Page<StockReturn> findByStatusIn(List<StockReturnStatus> statusList, Pageable pageable);


}
