package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.DailyOperationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DailyOperationLogRepository extends GenericRepository<DailyOperationLog, Long> {
        List<DailyOperationLog> findByDateAndCommercialUsername(LocalDate date, String commercialUsername);

        Page<DailyOperationLog> findByDateAndCommercialUsername(LocalDate date, String commercialUsername,
                        Pageable pageable);

        Page<DailyOperationLog> findByDateBetweenAndCommercialUsername(LocalDate startDate, LocalDate endDate,
                        String commercialUsername, Pageable pageable);

        Page<DailyOperationLog> findByDateBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);

        List<DailyOperationLog> findByDateBetween(LocalDate startDate, LocalDate endDate);

        List<DailyOperationLog> findByDateBetweenAndCommercialUsername(LocalDate startDate, LocalDate endDate,
                        String commercialUsername);
}
