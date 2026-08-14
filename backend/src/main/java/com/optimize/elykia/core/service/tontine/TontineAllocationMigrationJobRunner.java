package com.optimize.elykia.core.service.tontine;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TontineAllocationMigrationJobRunner {

    private final TontineAllocationMigrationService migrationService;

    @Async("tontineMigrationExecutor")
    public void runAsync(Long runId) {
        migrationService.executeMigration(runId);
    }
}
