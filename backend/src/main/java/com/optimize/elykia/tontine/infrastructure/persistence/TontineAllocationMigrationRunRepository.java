package com.optimize.elykia.tontine.infrastructure.persistence;

import com.optimize.elykia.tontine.domain.TontineAllocationMigrationRun;
import com.optimize.elykia.tontine.domain.TontineAllocationMigrationRunStatus;
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
