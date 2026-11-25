package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.report.TontineAllocationMigrationRun;
import com.optimize.elykia.core.enumaration.TontineAllocationMigrationRunStatus;

import java.time.LocalDateTime;

public record TontineAllocationMigrationStatusDto(
        Long id,
        boolean running,
        String fromVersion,
        String toVersion,
        int processedMembers,
        int totalMembers,
        int failedMembers,
        LocalDateTime startedAt,
        LocalDateTime finishedAt,
        TontineAllocationMigrationRunStatus status,
        String triggeredBy,
        String errorMessage) {

    public static TontineAllocationMigrationStatusDto idle() {
        return new TontineAllocationMigrationStatusDto(
                null, false, null, null, 0, 0, 0, null, null, null, null, null);
    }

    public static TontineAllocationMigrationStatusDto from(TontineAllocationMigrationRun run) {
        boolean running = run.getStatus() == TontineAllocationMigrationRunStatus.PENDING
                || run.getStatus() == TontineAllocationMigrationRunStatus.RUNNING;
        return new TontineAllocationMigrationStatusDto(
                run.getId(),
                running,
                run.getFromVersion(),
                run.getToVersion(),
                run.getProcessedMembers() != null ? run.getProcessedMembers() : 0,
                run.getTotalMembers() != null ? run.getTotalMembers() : 0,
                run.getFailedMembers() != null ? run.getFailedMembers() : 0,
                run.getStartedAt(),
                run.getFinishedAt(),
                run.getStatus(),
                run.getTriggeredBy(),
                run.getErrorMessage());
    }
}
