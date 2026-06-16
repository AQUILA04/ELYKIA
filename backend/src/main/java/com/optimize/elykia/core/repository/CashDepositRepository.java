package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.CashDeposit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface CashDepositRepository extends GenericRepository<CashDeposit, Long> {
    Page<CashDeposit> findByDateAndCommercialUsername(LocalDate date, String commercialUsername, Pageable pageable);

    Page<CashDeposit> findByDateBetweenAndCommercialUsername(LocalDate startDate, LocalDate endDate,
            String commercialUsername, Pageable pageable);

    Page<CashDeposit> findByDateBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);

    boolean existsByReference(String reference);

    Optional<CashDeposit> findByReference(String reference);
}
