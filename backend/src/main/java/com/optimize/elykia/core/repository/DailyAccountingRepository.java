package com.optimize.elykia.core.repository;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.DailyAccounting;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

public interface DailyAccountingRepository extends GenericRepository<DailyAccounting, Long> {

    Optional<DailyAccounting> findByAccountingDate(LocalDate accountingDate);

    boolean existsByStatus(AccountingDayStatus status);

    Optional<DailyAccounting> findByStatus(AccountingDayStatus status);

    default DailyAccounting getCurrentDailyAccounting() {
        return findByStatus(AccountingDayStatus.CURRENT)
                .orElseThrow(() -> new ResourceNotFoundException("Aucune comptabilisation journalière n'a été trouvée !"));
    }

    @Query(value = "SELECT * FROM daily_accounting WHERE accounting_date >= cast(:dateFrom as date) AND accounting_date <= cast(:dateTo as date)", nativeQuery = true)
    List<DailyAccounting> findByAccountingDateGreaterThanEqualAndAccountingDateLessThanEqual(LocalDate dateFrom, LocalDate dateTo);

    default Double sumByPeriod(LocalDate dateFrom, LocalDate dateTo) {
        return Optional.ofNullable(findByAccountingDateGreaterThanEqualAndAccountingDateLessThanEqual(dateFrom, dateTo))
                .orElse(Collections.emptyList())  // Si null, retourne une liste vide
                .stream()
                .mapToDouble(dailyAccounting -> Optional.ofNullable(dailyAccounting.getTotalAmount()).orElse(0.0))  // Si totalAmount est null, retourne 0.0
                .sum();
    }
}
