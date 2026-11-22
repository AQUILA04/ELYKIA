import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { delay, firstValueFrom, of, throwError } from 'rxjs';
import { SyncOrchestratorService } from './sync-orchestrator.service';
import { DataCleanerService } from './data-cleaner.service';
import { SequentialSyncManager } from './sequential-sync-manager.service';
import { IntegrityValidatorService } from './integrity-validator.service';
import { ErrorHandlerService } from './error-handler.service';
import { RollbackManagerService } from './rollback-manager.service';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';
import { SyncOptions, SyncStatus, SyncErrorType, MembersSyncResult, CollectionsSyncResult, StocksSyncResult, CleanupResult, ValidationResult, ErrorHandlingResult, RestorePoint } from '../../models/tontine-sync.models';

describe('SyncOrchestratorService', () => {
    let service: SyncOrchestratorService;
    let dataCleanerSpy: MockedObject<DataCleanerService>;
    let syncManagerSpy: MockedObject<SequentialSyncManager>;
    let integrityValidatorSpy: MockedObject<IntegrityValidatorService>;
    let errorHandlerSpy: MockedObject<ErrorHandlerService>;
    let rollbackManagerSpy: MockedObject<RollbackManagerService>;
    let dbServiceSpy: MockedObject<DatabaseService>;
    let loggerSpy: MockedObject<LoggerService>;

    let mockOptions: SyncOptions;

    const mockCleanupResult: CleanupResult = {
        membersDeleted: 10,
        collectionsDeleted: 20,
        stocksDeleted: 5,
        success: true
    };

    const mockMembersSyncResult: MembersSyncResult = {
        sessionId: 'session-123',
        totalPages: 3,
        processedPages: 3,
        totalItems: 257,
        savedItems: 257,
        errors: []
    };

    const mockCollectionsSyncResult: CollectionsSyncResult = {
        totalPages: 2,
        processedPages: 2,
        totalItems: 150,
        savedItems: 150,
        membersProcessed: 257,
        errors: []
    };

    const mockStocksSyncResult: StocksSyncResult = {
        sessionId: 'session-123',
        totalPages: 1,
        processedPages: 1,
        totalItems: 50,
        savedItems: 50,
        errors: []
    };

    const mockValidationResult: ValidationResult = {
        isValid: true,
        expectedCount: 457,
        actualCount: 457,
        missingItems: [],
        corruptedItems: [],
        checksumMatch: true
    };

    const mockRestorePoint: RestorePoint = {
        id: 'restore-123',
        timestamp: new Date(),
        dataSnapshot: {
            members: [],
            collections: [],
            stocks: [],
            timestamp: new Date()
        },
        metadata: {
            lastSyncDate: new Date(),
            lastSuccessfulSync: new Date(),
            syncVersion: '1.0.0',
            dataChecksum: 'abc123',
            totalItemsSynced: 0,
            syncDuration: 0
        }
    };

    beforeEach(() => {
        mockOptions = {
            forceCleanup: true,
            sessionId: 'session-123',
            commercialUsername: 'commercial1',
            batchSize: 100
        };

        const dataCleanerSpyObj = {
            cleanTontineData: vi.fn().mockName("DataCleanerService.cleanTontineData"),
            countUnsyncedTontineData: vi.fn().mockName("DataCleanerService.countUnsyncedTontineData")
        };
        const syncManagerSpyObj = {
            syncMembers: vi.fn().mockName("SequentialSyncManager.syncMembers"),
            syncCollections: vi.fn().mockName("SequentialSyncManager.syncCollections"),
            syncStocks: vi.fn().mockName("SequentialSyncManager.syncStocks")
        };
        const integrityValidatorSpyObj = {
            validateSyncResult: vi.fn().mockName("IntegrityValidatorService.validateSyncResult")
        };
        const errorHandlerSpyObj = {
            handleSyncError: vi.fn().mockName("ErrorHandlerService.handleSyncError").mockReturnValue({
                handled: true,
                shouldRetry: false,
                shouldRollback: false,
                userMessage: 'Erreur de synchronisation'
            }),
            shouldRetry: vi.fn().mockName("ErrorHandlerService.shouldRetry"),
            shouldRollback: vi.fn().mockName("ErrorHandlerService.shouldRollback")
        };
        const rollbackManagerSpyObj = {
            createRestorePoint: vi.fn().mockName("RollbackManagerService.createRestorePoint"),
            rollbackToRestorePoint: vi.fn().mockName("RollbackManagerService.rollbackToRestorePoint"),
            cleanupRestorePoints: vi.fn().mockName("RollbackManagerService.cleanupRestorePoints")
        };
        const dbServiceSpyObj = {
            getTontineSession: vi.fn().mockName("DatabaseService.getTontineSession"),
            query: vi.fn().mockName("DatabaseService.query")
        };
        const loggerSpyObj = {
            log: vi.fn().mockName("LoggerService.log")
        };

        TestBed.configureTestingModule({
            providers: [
                SyncOrchestratorService,
                { provide: DataCleanerService, useValue: dataCleanerSpyObj },
                { provide: SequentialSyncManager, useValue: syncManagerSpyObj },
                { provide: IntegrityValidatorService, useValue: integrityValidatorSpyObj },
                { provide: ErrorHandlerService, useValue: errorHandlerSpyObj },
                { provide: RollbackManagerService, useValue: rollbackManagerSpyObj },
                { provide: DatabaseService, useValue: dbServiceSpyObj },
                { provide: LoggerService, useValue: loggerSpyObj }
            ]
        });

        service = TestBed.inject(SyncOrchestratorService);
        dataCleanerSpy = TestBed.inject(DataCleanerService) as MockedObject<DataCleanerService>;
        syncManagerSpy = TestBed.inject(SequentialSyncManager) as MockedObject<SequentialSyncManager>;
        integrityValidatorSpy = TestBed.inject(IntegrityValidatorService) as MockedObject<IntegrityValidatorService>;
        errorHandlerSpy = TestBed.inject(ErrorHandlerService) as MockedObject<ErrorHandlerService>;
        rollbackManagerSpy = TestBed.inject(RollbackManagerService) as MockedObject<RollbackManagerService>;
        dbServiceSpy = TestBed.inject(DatabaseService) as MockedObject<DatabaseService>;
        loggerSpy = TestBed.inject(LoggerService) as MockedObject<LoggerService>;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('startSync', () => {
        beforeEach(() => {
            // Setup default successful mocks
            rollbackManagerSpy.createRestorePoint.mockReturnValue(Promise.resolve(mockRestorePoint));
            dataCleanerSpy.cleanTontineData.mockReturnValue(Promise.resolve(mockCleanupResult));
            dataCleanerSpy.countUnsyncedTontineData.mockReturnValue(Promise.resolve(0));
            dbServiceSpy.getTontineSession.mockReturnValue(Promise.resolve({ id: 'session-123' }));
            syncManagerSpy.syncMembers.mockReturnValue(of(mockMembersSyncResult));
            syncManagerSpy.syncCollections.mockReturnValue(of(mockCollectionsSyncResult));
            syncManagerSpy.syncStocks.mockReturnValue(of(mockStocksSyncResult));
            integrityValidatorSpy.validateSyncResult.mockReturnValue(mockValidationResult);

            // Setup query mocks for actual data counts
            dbServiceSpy.query
                .mockReturnValueOnce(Promise.resolve({ values: [{ count: 257 }] })) // members
                .mockReturnValueOnce(Promise.resolve({ values: [{ count: 150 }] })) // collections
                .mockReturnValueOnce(Promise.resolve({ values: [{ count: 50 }] })); // stocks
        });

        it('should complete full sync successfully', async () => {
            const result = await firstValueFrom(service.startSync(mockOptions));
            expect(result.success).toBe(true);
            expect(result.totalMembers).toBe(257);
            expect(result.totalCollections).toBe(150);
            expect(result.totalStocks).toBe(50);
            expect(result.errors.length).toBe(0);
            expect(result.duration).toBeGreaterThanOrEqual(0);
        });

        it('should create restore point before sync', async () => {
            await firstValueFrom(service.startSync(mockOptions));
            expect(rollbackManagerSpy.createRestorePoint).toHaveBeenCalled();
        });

        it('should perform cleanup when forceCleanup is true', async () => {
            await firstValueFrom(service.startSync(mockOptions));
            expect(dataCleanerSpy.cleanTontineData).toHaveBeenCalledWith('commercial1');
        });

        it('should skip cleanup when forceCleanup is false', async () => {
            const optionsNoCleanup = { ...mockOptions, forceCleanup: false };
            await firstValueFrom(service.startSync(optionsNoCleanup));
            expect(dataCleanerSpy.cleanTontineData).not.toHaveBeenCalled();
        });

        it('should skip cleanup when unsynced tontine data exists', async () => {
            dataCleanerSpy.countUnsyncedTontineData.mockReturnValue(Promise.resolve(3));
            await firstValueFrom(service.startSync(mockOptions));
            expect(dataCleanerSpy.cleanTontineData).not.toHaveBeenCalled();
            expect(integrityValidatorSpy.validateSyncResult).not.toHaveBeenCalled();
        });

        it('should sync members, collections, and stocks sequentially', async () => {
            await firstValueFrom(service.startSync(mockOptions));
            expect(syncManagerSpy.syncMembers).toHaveBeenCalledWith('session-123', mockOptions);
            expect(syncManagerSpy.syncCollections).toHaveBeenCalledWith(mockOptions);
            expect(syncManagerSpy.syncStocks).toHaveBeenCalledWith('session-123', mockOptions);
        });

        it('should validate integrity after sync', async () => {
            await firstValueFrom(service.startSync(mockOptions));
            expect(integrityValidatorSpy.validateSyncResult).toHaveBeenCalledWith(
                { memberCount: 257, collectionCount: 150, stockCount: 50 },
                { memberCount: 257, collectionCount: 150, stockCount: 50 }
            );
        });

        it('should update status to IN_PROGRESS when starting', async () => {
            const statusUpdates: SyncStatus[] = [];
            const sub = service.getSyncStatus().subscribe(status => statusUpdates.push(status));
            await firstValueFrom(service.startSync(mockOptions));
            sub.unsubscribe();
            expect(statusUpdates).toContain(SyncStatus.IN_PROGRESS);
        });

        it('should update status to COMPLETED when successful', async () => {
            const statusUpdates: SyncStatus[] = [];
            const sub = service.getSyncStatus().subscribe(status => statusUpdates.push(status));
            await firstValueFrom(service.startSync(mockOptions));
            sub.unsubscribe();
            expect(statusUpdates).toContain(SyncStatus.COMPLETED);
        });

        it('should reject concurrent sync attempts', async () => {
            syncManagerSpy.syncMembers.mockReturnValue(of(mockMembersSyncResult).pipe(delay(20)));
            const firstSyncPromise = firstValueFrom(service.startSync(mockOptions));

            await expect(firstValueFrom(service.startSync(mockOptions))).rejects.toMatchObject({
                type: SyncErrorType.VALIDATION,
                message: expect.stringContaining('déjà en cours'),
            });

            await firstSyncPromise;
        });

        it('should handle cleanup errors', async () => {
            dataCleanerSpy.cleanTontineData.mockReturnValue(Promise.reject(new Error('Cleanup failed')));

            const mockErrorHandlingResult: ErrorHandlingResult = {
                handled: true,
                shouldRetry: false,
                shouldRollback: true,
                userMessage: 'Erreur de nettoyage'
            };
            errorHandlerSpy.handleSyncError.mockReturnValue(mockErrorHandlingResult);
            rollbackManagerSpy.rollbackToRestorePoint.mockReturnValue(Promise.resolve());

            const result = await firstValueFrom(service.startSync(mockOptions));
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it('should handle sync errors with rollback', async () => {
            syncManagerSpy.syncMembers.mockReturnValue(throwError(() => ({
                type: SyncErrorType.DATABASE,
                message: 'Database error',
                context: {
                    sessionId: 'session-123',
                    commercialUsername: 'commercial1',
                    currentStep: 'syncMembers',
                    timestamp: new Date()
                },
                timestamp: new Date(),
                retryable: false
            })));

            const mockErrorHandlingResult: ErrorHandlingResult = {
                handled: true,
                shouldRetry: false,
                shouldRollback: true,
                userMessage: 'Erreur de base de données'
            };
            errorHandlerSpy.handleSyncError.mockReturnValue(mockErrorHandlingResult);
            rollbackManagerSpy.rollbackToRestorePoint.mockReturnValue(Promise.resolve());

            const result = await firstValueFrom(service.startSync(mockOptions));
            expect(result.success).toBe(false);
            expect(rollbackManagerSpy.rollbackToRestorePoint).toHaveBeenCalled();
        });

        it('should handle integrity validation failure', async () => {
            const failedValidation: ValidationResult = {
                isValid: false,
                expectedCount: 457,
                actualCount: 400,
                missingItems: ['57 membre(s) manquant(s)'],
                corruptedItems: [],
                checksumMatch: false
            };
            integrityValidatorSpy.validateSyncResult.mockReturnValue(failedValidation);

            const mockErrorHandlingResult: ErrorHandlingResult = {
                handled: true,
                shouldRetry: false,
                shouldRollback: false,
                userMessage: 'Échec de validation'
            };
            errorHandlerSpy.handleSyncError.mockReturnValue(mockErrorHandlingResult);

            const result = await firstValueFrom(service.startSync(mockOptions));
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].type).toBe(SyncErrorType.VALIDATION);
        });

        it('should handle missing session error', async () => {
            dbServiceSpy.getTontineSession.mockReturnValue(Promise.resolve(null));

            const mockErrorHandlingResult: ErrorHandlingResult = {
                handled: true,
                shouldRetry: false,
                shouldRollback: false,
                userMessage: 'Session non trouvée'
            };
            errorHandlerSpy.handleSyncError.mockReturnValue(mockErrorHandlingResult);

            const result = await firstValueFrom(service.startSync(mockOptions));
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('cancelSync', () => {
        beforeEach(() => {
            rollbackManagerSpy.createRestorePoint.mockReturnValue(Promise.resolve(mockRestorePoint));
            dataCleanerSpy.cleanTontineData.mockReturnValue(Promise.resolve(mockCleanupResult));
            dataCleanerSpy.countUnsyncedTontineData.mockReturnValue(Promise.resolve(0));
            dbServiceSpy.getTontineSession.mockReturnValue(Promise.resolve({ id: 'session-123' }));

            // Make sync operations take time
            syncManagerSpy.syncMembers.mockReturnValue(of(mockMembersSyncResult).pipe(delay(40)));
            syncManagerSpy.syncCollections.mockReturnValue(of(mockCollectionsSyncResult));
            syncManagerSpy.syncStocks.mockReturnValue(of(mockStocksSyncResult));
        });

        it('should cancel ongoing sync', async () => {
            const syncPromise = firstValueFrom(service.startSync(mockOptions));
            setTimeout(() => service.cancelSync(), 10);

            const result = await syncPromise;
            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.message.includes('annulée'))).toBe(true);
        });

        it('should update status to CANCELLED', async () => {
            const statusUpdates: SyncStatus[] = [];
            const sub = service.getSyncStatus().subscribe(status => statusUpdates.push(status));

            const syncPromise = firstValueFrom(service.startSync(mockOptions));
            setTimeout(() => service.cancelSync(), 10);

            await syncPromise;
            sub.unsubscribe();
            expect(statusUpdates).toContain(SyncStatus.CANCELLED);
        });
    });

    describe('getSyncStatus', () => {
        it('should return observable of sync status', async () => {
            const status = await firstValueFrom(service.getSyncStatus());
            expect(status).toBeDefined();
            expect(Object.values(SyncStatus)).toContain(status);
        });

        it('should start with PENDING status', async () => {
            const status = await firstValueFrom(service.getSyncStatus());
            expect(status).toBe(SyncStatus.PENDING);
        });
    });
});
