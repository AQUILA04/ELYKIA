package com.optimize.elykia.inventory.infrastructure.persistence;

import com.optimize.elykia.inventory.domain.WarehouseStockLedgerEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface WarehouseStockLedgerEntryRepository extends JpaRepository<WarehouseStockLedgerEntry, Long> {

    List<WarehouseStockLedgerEntry> findByAgencyIdAndArticleIdOrderByOccurredAtDescIdDesc(
            Long agencyId,
            Long articleId);

    @Query("""
            SELECT e FROM WarehouseStockLedgerEntry e
            WHERE (:agencyId IS NULL OR e.agencyId = :agencyId)
              AND (:articleId IS NULL OR e.articleId = :articleId)
              AND (:movementType IS NULL OR e.movementType = :movementType)
              AND (CAST(:startDate AS date) IS NULL OR e.operationDate >= :startDate)
              AND (CAST(:endDate AS date) IS NULL OR e.operationDate <= :endDate)
            ORDER BY e.occurredAt DESC, e.id DESC
            """)
    Page<WarehouseStockLedgerEntry> search(
            @Param("agencyId") Long agencyId,
            @Param("articleId") Long articleId,
            @Param("movementType") String movementType,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);
}
