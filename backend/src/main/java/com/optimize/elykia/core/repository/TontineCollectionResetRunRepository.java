package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.TontineCollectionResetRun;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

@Repository
public interface TontineCollectionResetRunRepository extends GenericRepository<TontineCollectionResetRun, Long> {

    Page<TontineCollectionResetRun> findAllByOrderByCreatedDateDesc(Pageable pageable);
}
