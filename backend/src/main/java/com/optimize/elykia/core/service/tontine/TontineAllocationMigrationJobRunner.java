package com.optimize.elykia.core.service.tontine;

import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class TontineAllocationMigrationJobRunner {

    private final TontineAllocationMigrationService migrationService;

    public TontineAllocationMigrationJobRunner(@Lazy TontineAllocationMigrationService migrationService) {
        this.migrationService = migrationService;
    }

    @Async("tontineMigrationExecutor")
    public void runAsync(Long runId) {
        migrationService.executeMigration(runId);
    }
}
