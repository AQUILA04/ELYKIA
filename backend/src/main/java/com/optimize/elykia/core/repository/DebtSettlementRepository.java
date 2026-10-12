package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.debt.DebtSettlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DebtSettlementRepository extends JpaRepository<DebtSettlement, Long> {

    boolean existsByReference(String reference);

    @Query("""
            SELECT DISTINCT s FROM DebtSettlement s
            JOIN FETCH s.allocations a
            WHERE a.debtDocument.id = :debtId
            ORDER BY s.performedAt DESC
            """)
    List<DebtSettlement> findByDebtDocumentId(@Param("debtId") Long debtId);

    @Query("""
            SELECT COALESCE(SUM(a.amount), 0)
            FROM DebtAllocation a
            WHERE a.debtDocument.id = :debtId
            """)
    double sumAllocatedAmount(@Param("debtId") Long debtId);
}
