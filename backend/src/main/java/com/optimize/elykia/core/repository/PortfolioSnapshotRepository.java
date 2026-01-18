package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.PortfolioSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Repository for PortfolioSnapshot entity
 * Provides optimized queries for portfolio snapshot data
 */
@Repository
public interface PortfolioSnapshotRepository extends JpaRepository<PortfolioSnapshot, Long> {
    
    /**
     * Find snapshot by specific date
     */
    Optional<PortfolioSnapshot> findBySnapshotDate(LocalDate snapshotDate);
    
    /**
     * Find the latest portfolio snapshot
     */
    @Query("SELECT p FROM PortfolioSnapshot p ORDER BY p.snapshotDate DESC LIMIT 1")
    Optional<PortfolioSnapshot> findLatest();
}