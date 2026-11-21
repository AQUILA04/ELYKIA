package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.elykia.tontine.domain.TontineMemberAllocationSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TontineMemberAllocationSnapshotRepository extends JpaRepository<TontineMemberAllocationSnapshot, Long> {

    boolean existsByRun_IdAndMemberId(Long runId, Long memberId);
}
