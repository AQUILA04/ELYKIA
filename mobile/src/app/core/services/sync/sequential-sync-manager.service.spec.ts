import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { SequentialSyncManager } from './sequential-sync-manager.service';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';
import { environment } from 'src/environments/environment';
import {
  SyncOptions,
  SyncErrorType
} from '../../models/tontine-sync.models';
import { of } from 'rxjs';

describe('SequentialSyncManager', () => {
  let service: SequentialSyncManager;
  let httpMock: HttpTestingController;
  let dbService: jasmine.SpyObj<DatabaseService>;
  let logService: jasmine.SpyObj<LoggerService>;
  let store: MockStore;

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
      'getUnsyncedCollectionsTotals'
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
            { selector: 'selectToken', value: mockToken }
          ]
        })
      ]
    });

    service = TestBed.inject(SequentialSyncManager);
    httpMock = TestBed.inject(HttpTestingController);
    dbService = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
    logService = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('syncMembers', () => {
    it('should sync members from a single page successfully', (done) => {
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

      dbService.getUnsyncedCollectionsTotals.and.returnValue(Promise.resolve([]));
      dbService.saveTontineMembers.and.returnValue(Promise.resolve());
      dbService.saveTontineDeliveries.and.returnValue(Promise.resolve());

      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: (result) => {
          expect(result.sessionId).toBe(sessionId);
          expect(result.totalPages).toBe(1);
          expect(result.processedPages).toBe(1);
          expect(result.totalItems).toBe(1);
          expect(result.savedItems).toBe(1);
          expect(result.errors.length).toBe(0);
          expect(dbService.saveTontineMembers).toHaveBeenCalledTimes(1);
          done();
        },
        error: (err) => done.fail(err)
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockResponse);
    });

    it('should sync members from multiple pages sequentially', (done) => {
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

      dbService.getUnsyncedCollectionsTotals.and.returnValue(Promise.resolve([]));
      dbService.saveTontineMembers.and.returnValue(Promise.resolve());
      dbService.saveTontineDeliveries.and.returnValue(Promise.resolve());

      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: (result) => {
          expect(result.totalPages).toBe(3);
          expect(result.processedPages).toBe(3);
          expect(result.totalItems).toBe(3);
          expect(result.savedItems).toBe(3);
          expect(result.errors.length).toBe(0);
          expect(dbService.saveTontineMembers).toHaveBeenCalledTimes(3);
          done();
        },
        error: (err) => done.fail(err)
      });

      // Vérifier que les requêtes sont faites séquentiellement
      const req1 = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req1.flush(mockPage1);

      const req2 = httpMock.expectOne(`${apiUrl}/tontines/members?page=1&size=100`);
      req2.flush(mockPage2);

      const req3 = httpMock.expectOne(`${apiUrl}/tontines/members?page=2&size=100`);
      req3.flush(mockPage3);
    });

    it('should adjust member totals with unsynced collections', (done) => {
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

      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: () => {
          const savedMembers = dbService.saveTontineMembers.calls.argsFor(0)[0];
          expect(savedMembers[0].totalContribution).toBe(1500); // 1000 + 500
          done();
        },
        error: (err) => done.fail(err)
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req.flush(mockResponse);
    });

    it('should prevent concurrent member synchronizations', (done) => {
      const sessionId = 'session-123';

      dbService.getUnsyncedCollectionsTotals.and.returnValue(Promise.resolve([]));
      dbService.saveTontineMembers.and.returnValue(Promise.resolve());

      // Démarrer la première synchronisation
      service.syncMembers(sessionId, defaultOptions).subscribe();

      // Tenter une deuxième synchronisation immédiatement
      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error.type).toBe(SyncErrorType.VALIDATION);
          expect(error.message).toContain('déjà en cours');
          done();
        }
      });

      // Répondre à la première requête
      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req.flush({
        data: {
          content: [],
          page: { number: 0, totalPages: 1, totalElements: 0 }
        }
      });
    });

    it('should handle network errors gracefully', (done) => {
      const sessionId = 'session-123';

      dbService.getUnsyncedCollectionsTotals.and.returnValue(Promise.resolve([]));

      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error.type).toBe(SyncErrorType.NETWORK);
          expect(error.retryable).toBe(true);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should handle database errors gracefully', (done) => {
      const sessionId = 'session-123';
      const mockResponse = {
        data: {
          content: [{ id: 1, client: { id: 'c1' }, totalContribution: 100 }],
          page: { number: 0, totalPages: 1, totalElements: 1 }
        }
      };

      dbService.getUnsyncedCollectionsTotals.and.returnValue(Promise.resolve([]));
      dbService.saveTontineMembers.and.returnValue(Promise.reject(new Error('DB error')));

      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error.type).toBe(SyncErrorType.DATABASE);
          expect(error.retryable).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req.flush(mockResponse);
    });

    it('should save deliveries when present in member data', (done) => {
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

      dbService.getUnsyncedCollectionsTotals.and.returnValue(Promise.resolve([]));
      dbService.saveTontineMembers.and.returnValue(Promise.resolve());
      dbService.saveTontineDeliveries.and.returnValue(Promise.resolve());

      service.syncMembers(sessionId, defaultOptions).subscribe({
        next: () => {
          expect(dbService.saveTontineDeliveries).toHaveBeenCalledTimes(1);
          const savedDeliveries = dbService.saveTontineDeliveries.calls.argsFor(0)[0];
          expect(savedDeliveries.length).toBe(1);
          expect(savedDeliveries[0].id).toBe('d1');
          expect(savedDeliveries[0].items.length).toBe(1);
          done();
        },
        error: (err) => done.fail(err)
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
      req.flush(mockResponse);
    });
  });

  describe('syncCollections', () => {
    it('should sync collections from a single page successfully', (done) => {
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

      service.syncCollections(defaultOptions).subscribe({
        next: (result) => {
          expect(result.totalPages).toBe(1);
          expect(result.processedPages).toBe(1);
          expect(result.totalItems).toBe(1);
          expect(result.savedItems).toBe(1);
          expect(result.errors.length).toBe(0);
          expect(dbService.saveTontineCollections).toHaveBeenCalledTimes(1);
          done();
        },
        error: (err) => done.fail(err)
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/collections?page=0&size=100`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should sync collections from multiple pages sequentially', (done) => {
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

      service.syncCollections(defaultOptions).subscribe({
        next: (result) => {
          expect(result.totalPages).toBe(2);
          expect(result.processedPages).toBe(2);
          expect(result.savedItems).toBe(2);
          expect(dbService.saveTontineCollections).toHaveBeenCalledTimes(2);
          done();
        },
        error: (err) => done.fail(err)
      });

      const req1 = httpMock.expectOne(`${apiUrl}/tontines/collections?page=0&size=100`);
      req1.flush(mockPage1);

      const req2 = httpMock.expectOne(`${apiUrl}/tontines/collections?page=1&size=100`);
      req2.flush(mockPage2);
    });

    it('should prevent concurrent collection synchronizations', (done) => {
      dbService.saveTontineCollections.and.returnValue(Promise.resolve());

      service.syncCollections(defaultOptions).subscribe();

      service.syncCollections(defaultOptions).subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error.type).toBe(SyncErrorType.VALIDATION);
          expect(error.message).toContain('déjà en cours');
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/collections?page=0&size=100`);
      req.flush({
        data: {
          content: [],
          page: { number: 0, totalPages: 1, totalElements: 0 }
        }
      });
    });
  });

  describe('syncStocks', () => {
    it('should sync stocks successfully', (done) => {
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

      service.syncStocks(sessionId, defaultOptions).subscribe({
        next: (result) => {
          expect(result.sessionId).toBe(sessionId);
          expect(result.totalPages).toBe(1);
          expect(result.processedPages).toBe(1);
          expect(result.totalItems).toBe(1);
          expect(result.savedItems).toBe(1);
          expect(result.errors.length).toBe(0);
          expect(dbService.saveTontineStocks).toHaveBeenCalledTimes(1);
          done();
        },
        error: (err) => done.fail(err)
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/stock`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle empty stocks response', (done) => {
      const sessionId = 'session-123';
      const mockResponse = {
        data: {
          content: []
        }
      };

      dbService.saveTontineStocks.and.returnValue(Promise.resolve());

      service.syncStocks(sessionId, defaultOptions).subscribe({
        next: (result) => {
          expect(result.totalItems).toBe(0);
          expect(result.savedItems).toBe(0);
          expect(result.processedPages).toBe(1);
          done();
        },
        error: (err) => done.fail(err)
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/stock`);
      req.flush(mockResponse);
    });

    it('should prevent concurrent stock synchronizations', (done) => {
      const sessionId = 'session-123';

      dbService.saveTontineStocks.and.returnValue(Promise.resolve());

      service.syncStocks(sessionId, defaultOptions).subscribe();

      service.syncStocks(sessionId, defaultOptions).subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error.type).toBe(SyncErrorType.VALIDATION);
          expect(error.message).toContain('déjà en cours');
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/tontines/stock`);
      req.flush({
        data: {
          content: []
        }
      });
    });
  });
});
