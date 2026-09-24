package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.sale.SaleCancellationRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface SaleCancellationRunRepository extends GenericRepository<SaleCancellationRun, Long> {

    Page<SaleCancellationRun> findAllByOrderByCreatedDateDesc(Pageable pageable);

    Page<SaleCancellationRun> findByCommercialUsernameOrderByCreatedDateDesc(String commercialUsername, Pageable pageable);

    Page<SaleCancellationRun> findByStartDateGreaterThanEqualAndEndDateLessThanEqualOrderByCreatedDateDesc(
            LocalDate startDate, LocalDate endDate, Pageable pageable);
}
