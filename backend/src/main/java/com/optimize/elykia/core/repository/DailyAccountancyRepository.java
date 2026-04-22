package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.accounting.DailyAccountancy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyAccountancyRepository extends GenericRepository<DailyAccountancy, Long> {

    Page<DailyAccountancy> findByDailyAccounting_idOrderByCollectorAsc(Long dailyAccountingId, Pageable pageable);

    Optional<DailyAccountancy> findByDailyAccounting_idAndCollectorAndIsOpened(Long dailyAccountingId, String collector, Boolean isOpened);

    boolean existsByIsOpenedIsTrue();

    List<DailyAccountancy> findAllByIsOpenedIsTrue();

    List<DailyAccountancy> findByAccountingDateGreaterThanEqualAndAccountingDateLessThanEqualAndCollector(LocalDate dateFrom, LocalDate dateTo, String collector);
}
