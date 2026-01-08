package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.CommercialMonthlyStock;

import java.util.Optional;

public interface CommercialMonthlyStockRepository extends GenericRepository<CommercialMonthlyStock, Long> {
    Optional<CommercialMonthlyStock> findByCollectorAndMonthAndYear(String collector, Integer month, Integer year);
}
