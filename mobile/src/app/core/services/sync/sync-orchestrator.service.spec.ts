import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SyncOrchestratorService } from './sync-orchestrator.service';
import { DataCleanerService } from './data-cleaner.service';
import { SequentialSyncManager } from './sequential-sync-manager.service';
import { IntegrityValidatorService } from './integrity-validator.service';
import { ErrorHandlerService } from './error-handler.service';
import { RollbackManagerService } from './rollback-manager.service';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';
import {
  SyncOptions,
  SyncStatus,
  SyncErrorType,
  MembersSyncResult,
  CollectionsSyncResult,
  StocksSyncResult,
  CleanupResult,
  ValidationResult,
  ErrorHandlingResult,
  RestorePoint
} from '../../models/tontine-sync.models';

describe('SyncOrchestratorService', () => {
  let service: SyncOrchestratorService;
  let dataCleanerSpy: jasmine.SpyObj<DataCleanerService>;
  let syncManagerSpy: jasmine.SpyObj<SequentialSyncManager>;
  let integrityValidatorSpy: jasmine.SpyObj<IntegrityValidatorService>;
  let errorHandlerSpy: jasmine.SpyObj<ErrorHandlerService>;
  let rollbackManagerSpy: jasmine.SpyObj<RollbackManagerService>;
  let dbServiceSpy: jasmine.SpyObj<DatabaseService>;
  let loggerSpy: jasmine.SpyObj<LoggerService>;

  const mockOptions: SyncOptions = {
    forceCleanup: true,
    sessionId: 'session-123',
    commercialUsername: 'commercial1',
    batchSize: 100
  };

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
    const dataCleanerSpyObj = jasmine.createSpyObj('DataCleanerService', ['cleanTontineData']);
    const syncManagerSpyObj = jasmine.createSpyObj('SequentialSyncManager', [
      'syncMembers',
      'syncCollections',
      'syncStocks'
    ]);
    const integrityValidatorSpyObj = jasmine.createSpyObj('IntegrityValidatorService', [
      'validateSyncResult'
    ]);
    const errorHandlerSpyObj = jasmine.createSpyObj('ErrorHandlerService', [
      'handleSyncError',
      'shouldRetry',
      'shouldRollback'
    ]);
    const rollbackManagerSpyObj = jasmine.createSpyObj('RollbackManagerService', [
      'createRestorePoint',
      'rollbackToRestorePoint',
      'cleanupRestorePoints'
    ]);
    const dbServiceSpyObj = jasmine.createSpyObj('DatabaseService', [
      'getTontineSession',
      'query'
    ]);
    const loggerSpyObj = jasmine.createSpyObj('LoggerService', ['log']);

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
    dataCleanerSpy = TestBed.inject(DataCleanerService) as jasmine.SpyObj<DataCleanerService>;
    syncManagerSpy = TestBed.inject(SequentialSyncManager) as jasmine.SpyObj<SequentialSyncManager>;
    integrityValidatorSpy = TestBed.inject(IntegrityValidatorService) as jasmine.SpyObj<IntegrityValidatorService>;
    errorHandlerSpy = TestBed.inject(ErrorHandlerService) as jasmine.SpyObj<ErrorHandlerService>;
    rollbackManagerSpy = TestBed.inject(RollbackManagerService) as jasmine.SpyObj<RollbackManagerService>;
    dbServiceSpy = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
    loggerSpy = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('startSync', () => {
    beforeEach(() => {
      // Setup default successful mocks
      rollbackManagerSpy.createRestorePoint.and.returnValue(Promise.resolve(mockRestorePoint));
      dataCleanerSpy.cleanTontineData.and.returnValue(Promise.resolve(mockCleanupResult));
      dbServiceSpy.getTontineSession.and.returnValue(Promise.resolve({ id: 'session-123' }));
      syncManagerSpy.syncMembers.and.returnValue(of(mockMembersSyncResult));
      syncManagerSpy.syncCollections.and.returnValue(of(mockCollectionsSyncResult));
      syncManagerSpy.syncStocks.and.returnValue(of(mockStocksSyncResult));
      integrityValidatorSpy.validateSyncResult.and.returnValue(mockValidationResult);
      
      // Setup query mocks for actual data counts
      dbServiceSpy.query.and.returnValues(
        Promise.resolve({ values: [{ count: 257 }] }), // members
        Promise.resolve({ values: [{ count: 150 }] }), // collections
        Promise.resolve({ values: [{ count: 50 }] })   // stocks
      );
    });

    it('should complete full sync successfully', (done) => {
      service.startSync(mockOptions).subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.totalMembers).toBe(257);
          expect(result.totalCollections).toBe(150);
          expect(result.totalStocks).toBe(50);
          expect(result.errors.length).toBe(0);
          expect(result.duration).toBeGreaterThan(0);
          done();
        },
        error: (error) => {
          fail(`Should not have errored: ${error.message}`);
          done();
        }
      });
    });

    it('should create restore point before sync', (done) => {
      service.startSync(mockOptions).subscribe({
        next: () => {
          expect(rollbackManagerSpy.createRestorePoint).toHaveBeenCalled();
          done();
        },
        error: (error) => {
          fail(`Should not have errored: ${error.message}`);
          done();
        }
      });
    });

    it('should perform cleanup when forceCleanup is true', (done) => {
      service.startSync(mockOptions).subscribe({
        next: () => {
          expect(dataCleanerSpy.cleanTontineData).toHaveBeenCalledWith('commercial1');
          done();
        },
        error: (error) => {
          fail(`Should not have errored: ${error.message}`);
          done();
        }
      });
    });

    it('should skip cleanup when forceCleanup is false', (done) => {
      const optionsNoCleanup = { ...mockOptions, forceCleanup: false };
      
      service.startSync(optionsNoCleanup).subscribe({
        next: () => {
          expect(dataCleanerSpy.cleanTontineData).not.toHaveBeenCalled();
          done();
        },
        error: (error) => {
          fail(`Should not have errored: ${error.message}`);
          done();
        }
      });
    });

    it('should sync members, collections, and stocks sequentially', (done) => {
      service.startSync(mockOptions).subscribe({
        next: () => {
          expect(syncManagerSpy.syncMembers).toHaveBeenCalledWith('session-123', mockOptions);
          expect(syncManagerSpy.syncCollections).toHaveBeenCalledWith(mockOptions);
          expect(syncManagerSpy.syncStocks).toHaveBeenCalledWith('session-123', mockOptions);
          done();
        },
        error: (error) => {
          fail(`Should not have errored: ${error.message}`);
          done();
        }
      });
    });

    it('should validate integrity after sync', (done) => {
      service.startSync(mockOptions).subscribe({
        next: () => {
          expect(integrityValidatorSpy.validateSyncResult).toHaveBeenCalledWith(
            { memberCount: 257, collectionCount: 150, stockCount: 50 },
            { memberCount: 257, collectionCount: 150, stockCount: 50 }
          );
          done();
        },
        error: (error) => {
          fail(`Should not have errored: ${error.message}`);
          done();
        }
      });
    });

    it('should update status to IN_PROGRESS when starting', (done) => {
      service.getSyncStatus().subscribe(status => {
        if (status === SyncStatus.IN_PROGRESS) {
          expect(status).toBe(SyncStatus.IN_PROGRESS);
          done();
        }
      });

      service.startSync(mockOptions).subscribe();
    });

    it('should update status to COMPLETED when successful', (done) => {
      let statusUpdates: SyncStatus[] = [];
      
      service.getSyncStatus().subscribe(status => {
        statusUpdates.push(status);
      });

      service.startSync(mockOptions).subscribe({
        next: () => {
          expect(statusUpdates).toContain(SyncStatus.COMPLETED);
          done();
        }
      });
    });

    it('should reject concurrent sync attempts', (done) => {
      // Start first sync
      service.startSync(mockOptions).subscribe();

      // Try to start second sync immediately
      service.startSync(mockOptions).subscribe({
        next: () => {
          fail('Should have rejected concurrent sync');
          done();
        },
        error: (error) => {
          expect(error.type).toBe(SyncErrorType.VALIDATION);
          expect(error.message).toContain('déjà en cours');
          done();
        }
      });
    });

    it('should handle cleanup errors', (done) => {
      dataCleanerSpy.cleanTontineData.and.returnValue(
        Promise.reject(new Error('Cleanup failed'))
      );

      const mockErrorHandlingResult: ErrorHandlingResult = {
        handled: true,
        shouldRetry: false,
        shouldRollback: true,
        userMessage: 'Erreur de nettoyage'
      };
      errorHandlerSpy.handleSyncError.and.returnValue(mockErrorHandlingResult);
      rollbackManagerSpy.rollbackToRestorePoint.and.returnValue(Promise.resolve());

      service.startSync(mockOptions).subscribe({
        next: (result) => {
          expect(result.success).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          done();
        },
        error: (error) => {
          fail(`Should not have thrown: ${error.message}`);
          done();
        }
      });
    });

    it('should handle sync errors with rollback', (done) => {
      syncManagerSpy.syncMembers.and.returnValue(
        throwError(() => ({
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
        }))
      );

      const mockErrorHandlingResult: ErrorHandlingResult = {
        handled: true,
        shouldRetry: false,
        shouldRollback: true,
        userMessage: 'Erreur de base de données'
      };
      errorHandlerSpy.handleSyncError.and.returnValue(mockErrorHandlingResult);
      rollbackManagerSpy.rollbackToRestorePoint.and.returnValue(Promise.resolve());

      service.startSync(mockOptions).subscribe({
        next: (result) => {
          expect(result.success).toBe(false);
          expect(rollbackManagerSpy.rollbackToRestorePoint).toHaveBeenCalled();
          done();
        },
        error: (error) => {
          fail(`Should not have thrown: ${error.message}`);
          done();
        }
      });
    });

    it('should handle integrity validation failure', (done) => {
      const failedValidation: ValidationResult = {
        isValid: false,
        expectedCount: 457,
        actualCount: 400,
        missingItems: ['57 membre(s) manquant(s)'],
        corruptedItems: [],
        checksumMatch: false
      };
      integrityValidatorSpy.validateSyncResult.and.returnValue(failedValidation);

      const mockErrorHandlingResult: ErrorHandlingResult = {
        handled: true,
        shouldRetry: false,
        shouldRollback: false,
        userMessage: 'Échec de validation'
      };
      errorHandlerSpy.handleSyncError.and.returnValue(mockErrorHandlingResult);

      service.startSync(mockOptions).subscribe({
        next: (result) => {
          expect(result.success).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0].type).toBe(SyncErrorType.VALIDATION);
          done();
        },
        error: (error) => {
          fail(`Should not have thrown: ${error.message}`);
          done();
        }
      });
    });

    it('should handle missing session error', (done) => {
      dbServiceSpy.getTontineSession.and.returnValue(Promise.resolve(null));

      const mockErrorHandlingResult: ErrorHandlingResult = {
        handled: true,
        shouldRetry: false,
        shouldRollback: false,
        userMessage: 'Session non trouvée'
      };
      errorHandlerSpy.handleSyncError.and.returnValue(mockErrorHandlingResult);

      service.startSync(mockOptions).subscribe({
        next: (result) => {
          expect(result.success).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
          done();
        },
        error: (error) => {
          fail(`Should not have thrown: ${error.message}`);
          done();
        }
      });
    });
  });

  describe('cancelSync', () => {
    beforeEach(() => {
      rollbackManagerSpy.createRestorePoint.and.returnValue(Promise.resolve(mockRestorePoint));
      dataCleanerSpy.cleanTontineData.and.returnValue(Promise.resolve(mockCleanupResult));
      dbServiceSpy.getTontineSession.and.returnValue(Promise.resolve({ id: 'session-123' }));
      
      // Make sync operations take time
      syncManagerSpy.syncMembers.and.returnValue(of(mockMembersSyncResult));
      syncManagerSpy.syncCollections.and.returnValue(of(mockCollectionsSyncResult));
      syncManagerSpy.syncStocks.and.returnValue(of(mockStocksSyncResult));
    });

    it('should cancel ongoing sync', (done) => {
      service.startSync(mockOptions).subscribe({
        next: () => {
          fail('Sync should have been cancelled');
          done();
        },
        error: (error) => {
          expect(error.message).toContain('annulée');
          done();
        }
      });

      // Cancel immediately
      setTimeout(() => {
        service.cancelSync();
      }, 10);
    });

    it('should update status to CANCELLED', (done) => {
      let statusUpdates: SyncStatus[] = [];
      
      service.getSyncStatus().subscribe(status => {
        statusUpdates.push(status);
        if (status === SyncStatus.CANCELLED) {
          expect(statusUpdates).toContain(SyncStatus.CANCELLED);
          done();
        }
      });

      service.startSync(mockOptions).subscribe({
        error: () => {
          // Expected error
        }
      });

      setTimeout(() => {
        service.cancelSync();
      }, 10);
    });
  });

  describe('getSyncStatus', () => {
    it('should return observable of sync status', (done) => {
      service.getSyncStatus().subscribe(status => {
        expect(status).toBeDefined();
        expect(Object.values(SyncStatus)).toContain(status);
        done();
      });
    });

    it('should start with PENDING status', (done) => {
      service.getSyncStatus().subscribe(status => {
        expect(status).toBe(SyncStatus.PENDING);
        done();
      });
    });
  });
});
