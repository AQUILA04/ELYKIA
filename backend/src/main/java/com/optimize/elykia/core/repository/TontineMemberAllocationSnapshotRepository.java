package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.report.TontineMemberAllocationSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TontineMemberAllocationSnapshotRepository extends JpaRepository<TontineMemberAllocationSnapshot, Long> {

    boolean existsByRun_IdAndMemberId(Long runId, Long memberId);
}
