package com.optimize.elykia.core.repository;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.AccountingDay;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;

import java.time.LocalDate;
import java.util.Optional;

public interface AccountingDayRepository extends GenericRepository<AccountingDay, Long> {

    boolean existsByStatus(AccountingDayStatus status);

    boolean existsByStatusAndAccountingDate(AccountingDayStatus status, LocalDate accountingDate);

    Optional<AccountingDay> findByStatus(AccountingDayStatus status);

    default AccountingDay getCurrentAccountingDay() {
        return findByStatus(AccountingDayStatus.OPENED)
                .orElseThrow(() -> new ResourceNotFoundException("accounting.not.found"));
    }
}
