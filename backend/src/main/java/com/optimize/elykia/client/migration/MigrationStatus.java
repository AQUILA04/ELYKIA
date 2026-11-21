package com.optimize.elykia.client.migration;

public record MigrationStatus(
        boolean running,
        long processed,
        long total,
        long migrated,
        long skipped,
        long errors
) {
}
