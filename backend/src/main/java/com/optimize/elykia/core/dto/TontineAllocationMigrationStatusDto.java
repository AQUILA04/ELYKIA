package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.report.TontineAllocationMigrationRun;
import com.optimize.elykia.core.enumaration.TontineAllocationMigrationRunStatus;

import java.time.LocalDateTime;

public record TontineAllocationMigrationStatusDto(
        boolean running,
        String fromVersion,
        String toVersion,
        int processedMembers,
        int totalMembers,
        int failedMembers,
        LocalDateTime startedAt,
        TontineAllocationMigrationRunStatus status) {

    public static TontineAllocationMigrationStatusDto idle() {
        return new TontineAllocationMigrationStatusDto(
                false, null, null, 0, 0, 0, null, null);
    }

    public static TontineAllocationMigrationStatusDto from(TontineAllocationMigrationRun run) {
        boolean running = run.getStatus() == TontineAllocationMigrationRunStatus.PENDING
                || run.getStatus() == TontineAllocationMigrationRunStatus.RUNNING;
        return new TontineAllocationMigrationStatusDto(
                running,
                run.getFromVersion(),
                run.getToVersion(),
                run.getProcessedMembers() != null ? run.getProcessedMembers() : 0,
                run.getTotalMembers() != null ? run.getTotalMembers() : 0,
                run.getFailedMembers() != null ? run.getFailedMembers() : 0,
                run.getStartedAt(),
                run.getStatus());
    }
}
