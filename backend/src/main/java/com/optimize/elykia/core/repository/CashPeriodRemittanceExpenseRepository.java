package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.report.CashPeriodRemittanceExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Set;

public interface CashPeriodRemittanceExpenseRepository extends JpaRepository<CashPeriodRemittanceExpense, Long> {

    List<CashPeriodRemittanceExpense> findByRemittanceId(Long remittanceId);

    void deleteByRemittanceId(Long remittanceId);

    boolean existsByExpenseId(Long expenseId);

    @Query("SELECT cre.expense.id FROM CashPeriodRemittanceExpense cre")
    Set<Long> findAllLinkedExpenseIds();

    @Query("SELECT cre.expense.id FROM CashPeriodRemittanceExpense cre WHERE cre.remittance.id = :remittanceId")
    Set<Long> findExpenseIdsByRemittanceId(Long remittanceId);

    @Query("""
        SELECT cre.expense.id FROM CashPeriodRemittanceExpense cre
        JOIN cre.remittance r WHERE r.status = com.optimize.elykia.core.enumaration.RemittanceStatus.RECEIVED
        AND cre.expense.id IN :expenseIds
    """)
    Set<Long> findReceivedExpenseIdsIn(Set<Long> expenseIds);
}
