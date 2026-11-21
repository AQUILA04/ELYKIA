package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.tontine.domain.TontineCollectionResetLine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TontineCollectionResetLineRepository extends GenericRepository<TontineCollectionResetLine, Long> {

    Page<TontineCollectionResetLine> findByRun_IdOrderByCollectionDateAscIdAsc(Long runId, Pageable pageable);

    List<TontineCollectionResetLine> findByRun_IdOrderByQuarterAscCollectionDateAscIdAsc(Long runId);
}
