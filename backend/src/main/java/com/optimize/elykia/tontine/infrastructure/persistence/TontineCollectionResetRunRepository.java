package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.tontine.domain.TontineCollectionResetRun;
import com.optimize.elykia.tontine.domain.TontineCollectionResetRunStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.Collection;

@Repository
public interface TontineCollectionResetRunRepository extends GenericRepository<TontineCollectionResetRun, Long> {

    Page<TontineCollectionResetRun> findAllByOrderByCreatedDateDesc(Pageable pageable);

    boolean existsBySessionIdAndStatusIn(Long sessionId, Collection<TontineCollectionResetRunStatus> statuses);
}
