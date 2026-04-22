# Requirements Document

## Introduction

This feature adds two complementary capabilities to the mobile sync pipeline:

1. **Pre-sync archiving**: Before each sync job, all rows from `sync_logs` are moved into a `sync_logs_archive` table (regardless of status), then `sync_logs` is cleared. This prevents unbounded table growth and keeps the active log table lean.

2. **Post-sync Crashlytics reporting**: After each sync session, all sync errors are retrieved and reported to Firebase Crashlytics as non-fatal exceptions, making sync failures visible in the Crashlytics console without interrupting the app.

Both capabilities integrate into `SyncMasterService.synchronizeAllData()` via two new services: `SyncArchiveService` and `CrashlyticsReporterService`, with a minor extension to `LoggerService`.

## Glossary

- **SyncMasterService**: The Angular service that orchestrates the complete synchronization process via `synchronizeAllData()`.
- **SyncArchiveService**: New service responsible for moving all rows from `sync_logs` to `sync_logs_archive` before each sync run.
- **CrashlyticsReporterService**: New service responsible for reporting sync errors to Firebase Crashlytics after each sync session.
- **LoggerService**: Existing service extended with a `recordException` method that wraps `FirebaseCrashlytics.recordException`.
- **SyncErrorService**: Existing service that reads sync errors from `sync_logs`.
- **DatabaseService**: Existing service that provides SQLite access.
- **FirebaseCrashlytics**: The `@capacitor-firebase/crashlytics` SDK used to report non-fatal exceptions.
- **sync_logs**: The active SQLite table where sync errors and results are written during a sync session.
- **sync_logs_archive**: The new SQLite table that stores all rows moved out of `sync_logs` before each sync run.
- **SyncError**: A data model representing a single sync failure entry from `sync_logs`.
- **SyncResult**: The return type of `synchronizeAllData()`, containing success/error counts and the list of errors.
- **archivedAt**: A timestamp column added to `sync_logs_archive` recording when a row was moved from `sync_logs`.

## Requirements

### Requirement 1: Pre-Sync Log Archiving

**User Story:** As a mobile app operator, I want all sync log rows to be archived before each sync job, so that the active `sync_logs` table stays lean and historical data is preserved.

#### Acceptance Criteria

1. WHEN `archiveOldErrors` is called, THE `SyncArchiveService` SHALL create the `sync_logs_archive` table if it does not already exist, using an idempotent `CREATE TABLE IF NOT EXISTS` statement.
2. WHEN `archiveOldErrors` is called, THE `SyncArchiveService` SHALL copy ALL rows from `sync_logs` into `sync_logs_archive` regardless of their `status` value.
3. WHEN `archiveOldErrors` is called, THE `SyncArchiveService` SHALL delete ALL rows from `sync_logs` after copying them to `sync_logs_archive`.
4. WHEN `archiveOldErrors` is called, THE `SyncArchiveService` SHALL return a `SyncArchiveResult` object with an `archived` field equal to the number of rows moved.
5. WHEN rows are inserted into `sync_logs_archive`, THE `SyncArchiveService` SHALL set the `archivedAt` column to the current timestamp for each archived row.
6. IF a database error occurs during archiving, THEN THE `SyncArchiveService` SHALL catch the error, log it via `LoggerService.error()`, and return `{ archived: 0 }`.
7. IF a database error occurs during archiving, THEN THE `SyncMasterService` SHALL continue executing the sync job without interruption.

### Requirement 2: Post-Sync Crashlytics Error Reporting

**User Story:** As a mobile app developer, I want sync errors to be reported to Firebase Crashlytics after each sync session, so that I can monitor sync failures in the Crashlytics console without requiring manual log inspection.

#### Acceptance Criteria

1. WHEN `synchronizeAllData` completes, THE `SyncMasterService` SHALL call `CrashlyticsReporterService.reportSyncErrors` after all sync steps have finished.
2. WHEN `reportSyncErrors` is called, THE `CrashlyticsReporterService` SHALL retrieve all current sync errors by calling `SyncErrorService.getSyncErrors()`.
3. WHEN sync errors exist after a session, THE `CrashlyticsReporterService` SHALL call `LoggerService.recordException` exactly once with a summary message describing the number of errors.
4. WHEN sync errors exist, THE `CrashlyticsReporterService` SHALL call `FirebaseCrashlytics.log` once for each individual error with its detail.
5. WHEN no sync errors exist after a session, THE `CrashlyticsReporterService` SHALL exit without making any calls to `LoggerService.recordException` or `FirebaseCrashlytics.log`.
6. IF the Crashlytics SDK throws during `reportSyncErrors`, THEN THE `CrashlyticsReporterService` SHALL catch the error, log it to console, and resolve without rethrowing.
7. THE `CrashlyticsReporterService` SHALL include only `entityType`, `entityId`, `errorCode`, and `errorMessage` in Crashlytics messages — `requestData` and `responseData` SHALL NOT be included.

### Requirement 3: LoggerService recordException Extension

**User Story:** As a developer, I want `LoggerService` to expose a `recordException` method, so that non-fatal exceptions can be reported to Crashlytics through the existing logging abstraction.

#### Acceptance Criteria

1. THE `LoggerService` SHALL expose a `recordException(message: string): Promise<void>` method.
2. WHEN `recordException` is called, THE `LoggerService` SHALL call `FirebaseCrashlytics.recordException({ message })` to create a non-fatal crash entry.
3. IF `FirebaseCrashlytics.recordException` throws, THEN THE `LoggerService` SHALL catch the error and log it to console without rethrowing.

### Requirement 4: SyncMasterService Integration

**User Story:** As a developer, I want the archiving and Crashlytics reporting steps to be integrated into the sync orchestration, so that they run automatically on every sync without requiring manual invocation.

#### Acceptance Criteria

1. WHEN `synchronizeAllData` is called, THE `SyncMasterService` SHALL call `SyncArchiveService.archiveOldErrors()` before any domain sync step executes.
2. WHEN `synchronizeAllData` completes all sync steps, THE `SyncMasterService` SHALL call `CrashlyticsReporterService.reportSyncErrors()` after the final sync step.
3. THE `SyncMasterService` SHALL inject `SyncArchiveService` and `CrashlyticsReporterService` as constructor dependencies.

### Requirement 5: sync_logs_archive Table Schema

**User Story:** As a developer, I want the archive table to mirror the `sync_logs` schema with an additional timestamp, so that archived data retains full fidelity and can be queried for historical analysis.

#### Acceptance Criteria

1. THE `sync_logs_archive` table SHALL contain all columns present in `sync_logs`: `id`, `entityType`, `entityId`, `operation`, `status`, `errorCode`, `requestData`, `responseData`, `entityDisplayName`, `entityDetails`, `errorMessage`, `syncDate`, `retryCount`.
2. THE `sync_logs_archive` table SHALL contain an additional `archivedAt` column of type `DATETIME` with a default value of `CURRENT_TIMESTAMP`.
3. THE `SyncArchiveService` SHALL create the `sync_logs_archive` table at runtime using `CREATE TABLE IF NOT EXISTS`, without modifying `DatabaseService.createTables`.
