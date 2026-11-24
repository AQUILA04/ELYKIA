package com.optimize.elykia.finance.infrastructure.persistence;

import com.optimize.elykia.finance.domain.CashSalesRegisterEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface CashSalesRegisterEntryRepository extends JpaRepository<CashSalesRegisterEntry, Long> {

    List<CashSalesRegisterEntry> findBySessionIdOrderByOccurredAtDescIdDesc(Long sessionId);

    List<CashSalesRegisterEntry> findByAccountingDateBetweenOrderByOccurredAtDescIdDesc(
            LocalDate startDate, LocalDate endDate);
}
