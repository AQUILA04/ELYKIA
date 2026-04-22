# Implementation Plan: Sync Error Archiving & Crashlytics Reporting

## Overview

Integrate two new services into the sync pipeline: `SyncArchiveService` (pre-sync log archiving) and `CrashlyticsReporterService` (post-sync Crashlytics reporting), plus a minor extension to `LoggerService`.

## Tasks

- [ ] 1. Extend LoggerService with recordException
  - [ ] 1.1 Add `recordException(message: string): Promise<void>` to `LoggerService`
    - Call `FirebaseCrashlytics.recordException({ message })` inside the method
    - Wrap in try/catch; on failure log to console and resolve without rethrowing
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 1.2 Write unit tests for `LoggerService.recordException`
    - Mock `FirebaseCrashlytics`; verify `recordException` is called with the correct message
    - Verify SDK errors are caught and do not propagate
    - _Requirements: 3.2, 3.3_

- [ ] 2. Create SyncArchiveService
  - [ ] 2.1 Create `mobile/src/app/core/services/sync-archive.service.ts`
    - Inject `DatabaseService` and `LoggerService`
    - Implement `archiveOldErrors(): Promise<{ archived: number }>`
    - Create `sync_logs_archive` table with `CREATE TABLE IF NOT EXISTS` (all `sync_logs` columns + `archivedAt DATETIME DEFAULT CURRENT_TIMESTAMP`)
    - Copy all rows via `INSERT INTO sync_logs_archive SELECT *, CURRENT_TIMESTAMP FROM sync_logs`
    - Delete all rows from `sync_logs`
    - Return `{ archived: N }` where N is the row count before deletion
    - On any DB error: catch, call `LoggerService.error()`, return `{ archived: 0 }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3_

  - [ ]* 2.2 Write property test for SyncArchiveService — Property 1: Archiving copies all rows regardless of status
    - **Property 1: Archiving copies all rows regardless of status**
    - Generate arbitrary arrays of sync_log rows with mixed `status` values; verify every row appears in `sync_logs_archive` after `archiveOldErrors()`
    - **Validates: Requirements 1.2**

  - [ ]* 2.3 Write property test for SyncArchiveService — Property 2: Archiving leaves sync_logs empty
    - **Property 2: Archiving leaves sync_logs empty**
    - For any non-empty initial state, verify `sync_logs` row count is zero after `archiveOldErrors()`
    - **Validates: Requirements 1.3**

  - [ ]* 2.4 Write property test for SyncArchiveService — Property 3: Archived row count matches source row count
    - **Property 3: Archived row count matches source row count**
    - For N rows in `sync_logs`, verify `archiveOldErrors()` returns `{ archived: N }`
    - **Validates: Requirements 1.4**

  - [ ]* 2.5 Write unit tests for SyncArchiveService error handling
    - Mock `DatabaseService` to throw; verify `{ archived: 0 }` is returned and `LoggerService.error` is called
    - _Requirements: 1.6_

- [ ] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Create CrashlyticsReporterService
  - [ ] 4.1 Create `mobile/src/app/core/services/crashlytics-reporter.service.ts`
    - Inject `SyncErrorService` and `LoggerService`
    - Implement `reportSyncErrors(syncResult: SyncResult): Promise<void>`
    - Call `SyncErrorService.getSyncErrors()` to retrieve current errors
    - If errors array is empty, return immediately (no Crashlytics calls)
    - If errors exist, call `LoggerService.recordException()` once with a summary message (e.g. `Sync completed with ${errors.length} error(s)`)
    - Call `FirebaseCrashlytics.log()` once per error with only `entityType`, `entityId`, `errorCode`, `errorMessage` — exclude `requestData` and `responseData`
    - Wrap entire method in try/catch; on failure log to console and resolve without rethrowing
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 4.2 Write property test for CrashlyticsReporterService — Property 4: recordException called exactly once for any non-empty error list
    - **Property 4: Crashlytics recordException called exactly once for any non-empty error list**
    - For any non-empty array of `SyncError` objects, verify `LoggerService.recordException` is called exactly once
    - **Validates: Requirements 2.3**

  - [ ]* 4.3 Write property test for CrashlyticsReporterService — Property 5: Crashlytics log called once per error
    - **Property 5: Crashlytics log called once per error**
    - For any array of N `SyncError` objects, verify `FirebaseCrashlytics.log` is called exactly N times
    - **Validates: Requirements 2.4**

  - [ ]* 4.4 Write property test for CrashlyticsReporterService — Property 6: Crashlytics messages contain no sensitive payload data
    - **Property 6: Crashlytics messages contain no sensitive payload data**
    - For any `SyncError` with non-null `requestData`/`responseData`, verify those fields do not appear in any string passed to `FirebaseCrashlytics.recordException` or `FirebaseCrashlytics.log`
    - **Validates: Requirements 2.7**

  - [ ]* 4.5 Write unit tests for CrashlyticsReporterService
    - Verify no-op when error list is empty (Requirements 2.5)
    - Verify SDK errors are swallowed (Requirements 2.6)
    - _Requirements: 2.5, 2.6_

- [ ] 5. Integrate into SyncMasterService
  - [ ] 5.1 Inject `SyncArchiveService` and `CrashlyticsReporterService` into `SyncMasterService`
    - Add both services as constructor parameters
    - _Requirements: 4.3_

  - [ ] 5.2 Call `archiveOldErrors()` as the first step in `synchronizeAllData()`
    - Place the call before `calculateTotalItems()` and all domain sync steps
    - Ensure a DB error from archiving does not throw — the result is discarded and sync continues
    - _Requirements: 4.1, 1.7_

  - [ ] 5.3 Call `reportSyncErrors()` as the last step in `synchronizeAllData()`
    - Place the call after the final domain sync step and before returning `SyncResult`
    - Pass the computed `SyncResult` to `reportSyncErrors`
    - _Requirements: 4.2_

  - [ ]* 5.4 Write integration tests for SyncMasterService orchestration
    - Mock `SyncArchiveService` and `CrashlyticsReporterService`; verify `archiveOldErrors` is called before any domain sync step and `reportSyncErrors` is called after the last step
    - _Requirements: 4.1, 4.2_

- [ ] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use the existing jasmine/karma setup
- `sync_logs_archive` table is created at runtime by `SyncArchiveService` — no changes to `DatabaseService.createTables` are needed
