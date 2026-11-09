package com.optimize.elykia.core.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.core.entity.report.TontineCollectionResetMember;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

@Repository
public interface TontineCollectionResetMemberRepository extends GenericRepository<TontineCollectionResetMember, Long> {

    Page<TontineCollectionResetMember> findByRun_IdOrderByClientNameAscIdAsc(Long runId, Pageable pageable);
}
