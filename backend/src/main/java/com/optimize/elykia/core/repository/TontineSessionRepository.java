package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.TontineSession;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TontineSessionRepository extends GenericRepository<TontineSession, Long> {
    Optional<TontineSession> findByYear(Integer year);

    List<TontineSession> findByStatusAndEndDateBefore(TontineSessionStatus status, LocalDate date);

    List<TontineSession> findByStatus(TontineSessionStatus status);
}
