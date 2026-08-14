package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.report.TontineAllocationMigrationRun;
import com.optimize.elykia.core.enumaration.TontineAllocationMigrationRunStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TontineAllocationMigrationRunRepository extends JpaRepository<TontineAllocationMigrationRun, Long> {

    @Query("""
            SELECT r FROM TontineAllocationMigrationRun r
            WHERE r.status IN :statuses
            ORDER BY r.id DESC
            """)
    List<TontineAllocationMigrationRun> findByStatusInOrderByIdDesc(
            @Param("statuses") List<TontineAllocationMigrationRunStatus> statuses,
            org.springframework.data.domain.Pageable pageable);

    default Optional<TontineAllocationMigrationRun> findLatestByStatusIn(
            List<TontineAllocationMigrationRunStatus> statuses) {
        List<TontineAllocationMigrationRun> runs = findByStatusInOrderByIdDesc(
                statuses, org.springframework.data.domain.PageRequest.of(0, 1));
        return runs.isEmpty() ? Optional.empty() : Optional.of(runs.get(0));
    }

    boolean existsByStatus(TontineAllocationMigrationRunStatus status);
}
