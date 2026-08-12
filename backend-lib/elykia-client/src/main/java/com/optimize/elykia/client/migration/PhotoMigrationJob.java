package com.optimize.elykia.client.migration;

public interface PhotoMigrationJob {
    MigrationReport runMigration();

    MigrationStatus getStatus();
}
