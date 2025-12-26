package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.DailyBusinessSnapshot;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyBusinessSnapshotRepository extends GenericRepository<DailyBusinessSnapshot, Long> {
    
    Optional<DailyBusinessSnapshot> findBySnapshotDate(LocalDate snapshotDate);
    
    List<DailyBusinessSnapshot> findBySnapshotDateBetweenOrderBySnapshotDateDesc(LocalDate startDate, LocalDate endDate);
    
    @Query("SELECT d FROM DailyBusinessSnapshot d WHERE d.snapshotDate >= :startDate ORDER BY d.snapshotDate DESC")
    List<DailyBusinessSnapshot> findRecentSnapshots(@Param("startDate") LocalDate startDate);
    
    @Query("SELECT SUM(d.newCreditsTotalAmount) FROM DailyBusinessSnapshot d WHERE d.snapshotDate BETWEEN :startDate AND :endDate")
    Double sumSalesByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
