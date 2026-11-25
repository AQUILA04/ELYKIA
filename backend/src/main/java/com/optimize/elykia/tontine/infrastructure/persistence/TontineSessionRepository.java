package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.tontine.domain.TontineSession;
import com.optimize.elykia.tontine.domain.TontineSessionKind;
import com.optimize.elykia.tontine.domain.TontineSessionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TontineSessionRepository extends GenericRepository<TontineSession, Long> {

    Optional<TontineSession> findByYearAndKind(Integer year, TontineSessionKind kind);

    /** @deprecated Utiliser {@link #findByYearAndKind(Integer, TontineSessionKind)} ; conservé en repli sur la session annuelle. */
    @Deprecated
    default Optional<TontineSession> findByYear(Integer year) {
        return findByYearAndKind(year, TontineSessionKind.ANNUAL);
    }

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM TontineSession s WHERE s.id = :id")
    Optional<TontineSession> lockById(@Param("id") Long id);

    Optional<TontineSession> findByCode(String code);

    boolean existsByCode(String code);

    List<TontineSession> findByStatusAndEndDateBefore(TontineSessionStatus status, LocalDate date);

    List<TontineSession> findByStatus(TontineSessionStatus status);
}
