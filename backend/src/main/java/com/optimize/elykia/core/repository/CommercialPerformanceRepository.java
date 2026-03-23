package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.bi.CommercialPerformance;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CommercialPerformanceRepository extends GenericRepository<CommercialPerformance, Long> {
    
    Optional<CommercialPerformance> findByCollectorAndPeriodStartAndPeriodEnd(
        String collector, LocalDate periodStart, LocalDate periodEnd
    );
    
    List<CommercialPerformance> findByPeriodStartAndPeriodEnd(LocalDate periodStart, LocalDate periodEnd);
    
    List<CommercialPerformance> findByCollectorOrderByPeriodStartDesc(String collector);
    
    @Query("SELECT c FROM CommercialPerformance c WHERE c.periodStart >= :startDate AND c.periodEnd <= :endDate ORDER BY c.totalSalesAmount DESC")
    List<CommercialPerformance> findTopPerformersByPeriod(
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );
}