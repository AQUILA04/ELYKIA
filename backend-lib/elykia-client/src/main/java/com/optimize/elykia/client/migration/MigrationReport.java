package com.optimize.elykia.client.migration;

public record MigrationReport(long total, long migrated, long skipped, long errors) {
}
