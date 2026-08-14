import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { SequentialSyncManager } from './sequential-sync-manager.service';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';
import { environment } from 'src/environments/environment';
import { selectToken } from '../../../store/auth/auth.selectors';
import {
  SyncOptions,
  SyncErrorType
} from '../../models/tontine-sync.models';

describe('SequentialSyncManager', () => {
  let service: SequentialSyncManager;
  let httpMock: HttpTestingController;
  let dbService: jasmine.SpyObj<DatabaseService>;
  let logService: jasmine.SpyObj<LoggerService>;

  const mockToken = 'test-token-123';
  const apiUrl = environment.apiUrl + '/api/v1';

  const defaultOptions: SyncOptions = {
    forceCleanup: false,
    sessionId: 'session-123',
    commercialUsername: 'testuser',
    batchSize: 100
  };

  beforeEach(() => {
    const dbServiceSpy = jasmine.createSpyObj('DatabaseService', [
      'saveTontineMembers',
      'saveTontineDeliveries',
      'saveTontineCollections',
      'saveTontineStocks',
      'getUnsyncedCollectionsTotals',
      'getUnsyncedLocalCollectionIds'
    ]);

    const logServiceSpy = jasmine.createSpyObj('LoggerService', ['log']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SequentialSyncManager,
        { provide: DatabaseService, useValue: dbServiceSpy },
        { provide: LoggerService, useValue: logServiceSpy },
        provideMockStore({
          initialState: {},
          selectors: [
            { selector: selectToken, value: mockToken }
          ]
        })
      ]
    });

    service = TestBed.inject(SequentialSyncManager);
    httpMock = TestBed.inject(HttpTestingController);
    dbService = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
    dbService.getUnsyncedCollectionsTotals.and.returnValue(Promise.resolve([]));
    dbService.getUnsyncedLocalCollectionIds.and.returnValue(Promise.resolve([]));
    logService = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  afterEach(() => {
    (service as any).collectionsSyncLock = false;
    (service as any).membersSyncLock = false;
    (service as any).stocksSyncLock = false;
    httpMock.verify();
  });

  describe('syncMembers', () => {
    it('should sync members from a single page successfully', fakeAsync(() => {
      const sessionId = 'session-123';
      const mockMembers = [
        {
          id: 1,
          client: { id: 'client-1' },
          totalContribution: 1000,
          deliveryStatus: 'PENDING',
          registrationDate: '2024-01-01',
          frequency: 'MONTHLY',
          amount: 100,
          notes: 'Test member'
        }
      ];

      const mockResponse = {
        data: {
          content: mockMembers,
          page: {
            number: 0,
            totalPages: 1,
            totalElements: 1
          }
        }
      };

      dbService.saveTontineMembers.and.returnValue(Promise.resolve());
      dbService.saveTontineDeliveries.and.returnValue(Promise.resolve());

      let result: any;
      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: (value) => result = value,
        error: fail
      });
      flushMicrotasks();

      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockResponse);
      flushMicrotasks();

      expect(result.sessionId).toBe(sessionId);
      expect(result.totalPages).toBe(1);
      expect(result.processedPages).toBe(1);
      expect(result.totalItems).toBe(1);
      expect(result.savedItems).toBe(1);
      expect(result.errors.length).toBe(0);
      expect(dbService.saveTontineMembers).toHaveBeenCalledTimes(1);
    }));

    it('should sync members from multiple pages sequentially', fakeAsync(() => {
      const sessionId = 'session-123';

      const mockPage1 = {
        data: {
          content: [{ id: 1, client: { id: 'c1' }, totalContribution: 100 }],
          page: { number: 0, totalPages: 3, totalElements: 3 }
        }
      };

      const mockPage2 = {
        data: {
          content: [{ id: 2, client: { id: 'c2' }, totalContribution: 200 }],
          page: { number: 1, totalPages: 3, totalElements: 3 }
        }
      };

      const mockPage3 = {
        data: {
          content: [{ id: 3, client: { id: 'c3' }, totalContribution: 300 }],
          page: { number: 2, totalPages: 3, totalElements: 3 }
        }
      };

      dbService.saveTontineMembers.and.returnValue(Promise.resolve());
      dbService.saveTontineDeliveries.and.returnValue(Promise.resolve());

      let result: any;
      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: (value) => result = value,
        error: fail
      });
      flushMicrotasks();

      const req1 = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req1.flush(mockPage1);
      flushMicrotasks();

      const req2 = httpMock.expectOne(`${apiUrl}/tontines/members?page=1&size=100`);
      req2.flush(mockPage2);
      flushMicrotasks();

      const req3 = httpMock.expectOne(`${apiUrl}/tontines/members?page=2&size=100`);
      req3.flush(mockPage3);
      flushMicrotasks();

      expect(result.totalPages).toBe(3);
      expect(result.processedPages).toBe(3);
      expect(result.totalItems).toBe(3);
      expect(result.savedItems).toBe(3);
      expect(result.errors.length).toBe(0);
      expect(dbService.saveTontineMembers).toHaveBeenCalledTimes(3);
    }));

    it('should adjust member totals with unsynced collections', fakeAsync(() => {
      const sessionId = 'session-123';
      const mockMembers = [
        { id: 1, client: { id: 'c1' }, totalContribution: 1000 }
      ];

      const mockResponse = {
        data: {
          content: mockMembers,
          page: { number: 0, totalPages: 1, totalElements: 1 }
        }
      };

      const unsyncedTotals = [{ tontineMemberId: '1', total: 500 }];

      dbService.getUnsyncedCollectionsTotals.and.returnValue(Promise.resolve(unsyncedTotals));
      dbService.saveTontineMembers.and.returnValue(Promise.resolve());

      service.syncMembers(sessionId, defaultOptions).subscribe({ error: fail });
      flushMicrotasks();

      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req.flush(mockResponse);
      flushMicrotasks();

      const savedMembers = dbService.saveTontineMembers.calls.argsFor(0)[0];
      expect(savedMembers[0].totalContribution).toBe(1500);
    }));

    it('should prevent concurrent member synchronizations', fakeAsync(() => {
      const sessionId = 'session-123';

      dbService.saveTontineMembers.and.returnValue(Promise.resolve());

      let concurrentError: any;
      service.syncMembers(sessionId, defaultOptions).subscribe();
      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => concurrentError = error
      });

      expect(concurrentError.type).toBe(SyncErrorType.VALIDATION);
      expect(concurrentError.message).toContain('déjà en cours');

      flushMicrotasks();
      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req.flush({
        data: {
          content: [],
          page: { number: 0, totalPages: 1, totalElements: 0 }
        }
      });
      flushMicrotasks();
    }));

    it('should handle network errors gracefully', fakeAsync(() => {
      const sessionId = 'session-123';

      let error: any;
      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (err) => error = err
      });
      flushMicrotasks();

      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req.error(new ProgressEvent('Network error'));
      flushMicrotasks();

      expect(error.type).toBe(SyncErrorType.NETWORK);
      expect(error.retryable).toBe(true);
    }));

    it('should handle database errors gracefully', fakeAsync(() => {
      const sessionId = 'session-123';
      const mockResponse = {
        data: {
          content: [{ id: 1, client: { id: 'c1' }, totalContribution: 100 }],
          page: { number: 0, totalPages: 1, totalElements: 1 }
        }
      };

      dbService.saveTontineMembers.and.callFake(() => Promise.reject(new Error('DB error')));

      let error: any;
      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (err) => error = err
      });
      flushMicrotasks();

      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req.flush(mockResponse);
      flushMicrotasks();

      expect(error.type).toBe(SyncErrorType.DATABASE);
      expect(error.retryable).toBe(false);
    }));

    it('should save deliveries when present in member data', fakeAsync(() => {
      const sessionId = 'session-123';
      const mockMembers = [
        {
          id: 1,
          client: { id: 'c1' },
          totalContribution: 1000,
          delivery: {
            id: 'd1',
            requestDate: '2024-01-01',
            deliveryDate: '2024-01-02',
            totalAmount: 500,
            status: 'DELIVERED',
            items: [
              {
                id: 'i1',
                articleId: 'a1',
                quantity: 2,
                unitPrice: 250,
                totalPrice: 500
              }
            ]
          }
        }
      ];

      const mockResponse = {
        data: {
          content: mockMembers,
          page: { number: 0, totalPages: 1, totalElements: 1 }
        }
      };

      dbService.saveTontineMembers.and.returnValue(Promise.resolve());
      dbService.saveTontineDeliveries.and.returnValue(Promise.resolve());

      service.syncMembers(sessionId, defaultOptions).subscribe({ error: fail });
      flushMicrotasks();

      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req.flush(mockResponse);
      flushMicrotasks();

      expect(dbService.saveTontineDeliveries).toHaveBeenCalledTimes(1);
      const savedDeliveries = dbService.saveTontineDeliveries.calls.argsFor(0)[0];
      expect(savedDeliveries.length).toBe(1);
      expect(savedDeliveries[0].id).toBe('d1');
      expect(savedDeliveries[0].items.length).toBe(1);
    }));
  });

  describe('syncCollections', () => {
    it('should sync collections from a single page successfully', fakeAsync(() => {
      const mockCollections = [
        {
          id: 1,
          tontineMemberId: 'member-1',
          amount: 100,
          collectionDate: '2024-01-01'
        }
      ];

      const mockResponse = {
        data: {
          content: mockCollections,
          page: { number: 0, totalPages: 1, totalElements: 1 }
        }
      };

      dbService.saveTontineCollections.and.returnValue(Promise.resolve());

      let result: any;
      service.syncCollections(defaultOptions).subscribe({
        next: (value) => result = value,
        error: fail
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/collections?page=0&size=100`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      flushMicrotasks();

      expect(result.totalPages).toBe(1);
      expect(result.processedPages).toBe(1);
      expect(result.totalItems).toBe(1);
      expect(result.savedItems).toBe(1);
      expect(result.errors.length).toBe(0);
      expect(dbService.saveTontineCollections).toHaveBeenCalledTimes(1);
    }));

    it('does not overwrite an unsynced local collection during pull', fakeAsync(() => {
      dbService.getUnsyncedLocalCollectionIds.and.returnValue(Promise.resolve(['uuid-local']));
      dbService.saveTontineCollections.and.returnValue(Promise.resolve());

      let result: any;
      service.syncCollections(defaultOptions).subscribe({
        next: (value) => result = value,
        error: fail
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/collections?page=0&size=100`);
      req.flush({
        data: {
          content: [{
            id: 99,
            reference: 'uuid-local',
            tontineMemberId: 'member-1',
            amount: 100,
            collectionDate: '2026-03-15',
            societyShareAmount: 1000,
            contributionMonth: '2026-03-01'
          }],
          page: { number: 0, totalPages: 1, totalElements: 1 }
        }
      });
      flushMicrotasks();

      expect(result.savedItems).toBe(0);
      expect(dbService.saveTontineCollections).not.toHaveBeenCalled();
    }));

    it('should sync collections from multiple pages sequentially', fakeAsync(() => {
      const mockPage1 = {
        data: {
          content: [{ id: 1, tontineMemberId: 'm1', amount: 100 }],
          page: { number: 0, totalPages: 2, totalElements: 2 }
        }
      };

      const mockPage2 = {
        data: {
          content: [{ id: 2, tontineMemberId: 'm2', amount: 200 }],
          page: { number: 1, totalPages: 2, totalElements: 2 }
        }
      };

      dbService.saveTontineCollections.and.returnValue(Promise.resolve());

      let result: any;
      service.syncCollections(defaultOptions).subscribe({
        next: (value) => result = value,
        error: fail
      });

      const req1 = httpMock.expectOne(`${apiUrl}/tontines/collections?page=0&size=100`);
      req1.flush(mockPage1);
      flushMicrotasks();

      const req2 = httpMock.expectOne(`${apiUrl}/tontines/collections?page=1&size=100`);
      req2.flush(mockPage2);
      flushMicrotasks();

      expect(result.totalPages).toBe(2);
      expect(result.processedPages).toBe(2);
      expect(result.savedItems).toBe(2);
      expect(dbService.saveTontineCollections).toHaveBeenCalledTimes(2);
    }));

    it('should prevent concurrent collection synchronizations', fakeAsync(() => {
      dbService.saveTontineCollections.and.returnValue(Promise.resolve());

      let concurrentError: any;
      service.syncCollections(defaultOptions).subscribe();
      service.syncCollections(defaultOptions).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => concurrentError = error
      });

      expect(concurrentError.type).toBe(SyncErrorType.VALIDATION);
      expect(concurrentError.message).toContain('déjà en cours');

      const req = httpMock.expectOne(`${apiUrl}/tontines/collections?page=0&size=100`);
      req.flush({
        data: {
          content: [],
          page: { number: 0, totalPages: 1, totalElements: 0 }
        }
      });
      flushMicrotasks();
    }));
  });

  describe('syncStocks', () => {
    it('should sync stocks successfully', fakeAsync(() => {
      const sessionId = 'session-123';
      const mockStocks = [
        {
          id: 1,
          commercial: 'testuser',
          articleId: 'a1',
          articleName: 'Article 1',
          unitPrice: 100,
          totalQuantity: 50,
          availableQuantity: 30,
          distributedQuantity: 20,
          year: 2024
        }
      ];

      const mockResponse = {
        data: {
          content: mockStocks
        }
      };

      dbService.saveTontineStocks.and.returnValue(Promise.resolve());

      let result: any;
      service.syncStocks(sessionId, defaultOptions).subscribe({
        next: (value) => result = value,
        error: fail
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/stock`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
      flushMicrotasks();

      expect(result.sessionId).toBe(sessionId);
      expect(result.totalPages).toBe(1);
      expect(result.processedPages).toBe(1);
      expect(result.totalItems).toBe(1);
      expect(result.savedItems).toBe(1);
      expect(result.errors.length).toBe(0);
      expect(dbService.saveTontineStocks).toHaveBeenCalledTimes(1);
    }));

    it('should handle empty stocks response', fakeAsync(() => {
      const sessionId = 'session-123';
      const mockResponse = {
        data: {
          content: []
        }
      };

      dbService.saveTontineStocks.and.returnValue(Promise.resolve());

      let result: any;
      service.syncStocks(sessionId, defaultOptions).subscribe({
        next: (value) => result = value,
        error: fail
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/stock`);
      req.flush(mockResponse);
      flushMicrotasks();

      expect(result.totalItems).toBe(0);
      expect(result.savedItems).toBe(0);
      expect(result.processedPages).toBe(1);
    }));

    it('should prevent concurrent stock synchronizations', fakeAsync(() => {
      const sessionId = 'session-123';

      dbService.saveTontineStocks.and.returnValue(Promise.resolve());

      let concurrentError: any;
      service.syncStocks(sessionId, defaultOptions).subscribe();
      service.syncStocks(sessionId, defaultOptions).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => concurrentError = error
      });

      expect(concurrentError.type).toBe(SyncErrorType.VALIDATION);
      expect(concurrentError.message).toContain('déjà en cours');

      const req = httpMock.expectOne(`${apiUrl}/tontines/stock`);
      req.flush({
        data: {
          content: []
        }
      });
      flushMicrotasks();
    }));
  });
});
