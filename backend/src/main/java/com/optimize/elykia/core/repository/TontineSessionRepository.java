package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TontineSessionRepository extends GenericRepository<TontineSession, Long> {
    Optional<TontineSession> findByYear(Integer year);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM TontineSession s WHERE s.id = :id")
    Optional<TontineSession> lockById(@Param("id") Long id);

    List<TontineSession> findByStatusAndEndDateBefore(TontineSessionStatus status, LocalDate date);

    List<TontineSession> findByStatus(TontineSessionStatus status);
}
