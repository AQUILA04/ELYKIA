package com.optimize.elykia.core.service;

import com.optimize.elykia.core.entity.DailyOperationLog;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.DailyOperationLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class DailyOperationService {

    private final DailyOperationLogRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logOperation(String commercialUsername, OperationType type, Double amount, String reference,
            String description) {
        DailyOperationLog log = new DailyOperationLog(
                LocalDate.now(),
                commercialUsername,
                LocalDateTime.now(),
                type,
                amount,
                reference,
                description);
        repository.save(log);
    }

    public Page<DailyOperationLog> getOperations(LocalDate startDate, LocalDate endDate, String commercialUsername,
            Pageable pageable) {
        if (commercialUsername != null) {
            if (startDate != null && endDate != null) {
                return ((DailyOperationLogRepository) repository).findByDateBetweenAndCommercialUsername(startDate,
                        endDate,
                        commercialUsername, pageable);
            } else if (startDate != null) {
                return ((DailyOperationLogRepository) repository).findByDateAndCommercialUsername(startDate,
                        commercialUsername, pageable);
            }
        } else {
            if (startDate != null && endDate != null) {
                return ((DailyOperationLogRepository) repository).findByDateBetween(startDate, endDate, pageable);
            }
        }
        return Page.empty();
    }
}
