package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.report.TontineAllocationMigrationFailure;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TontineAllocationMigrationFailureRepository
        extends JpaRepository<TontineAllocationMigrationFailure, Long> {

    Page<TontineAllocationMigrationFailure> findByRunIdOrderByIdAsc(Long runId, Pageable pageable);

    void deleteByRunIdAndMemberId(Long runId, Long memberId);
}
