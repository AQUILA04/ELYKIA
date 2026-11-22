import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { SequentialSyncManager } from './sequential-sync-manager.service';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';
import { environment } from 'src/environments/environment';
import { selectToken } from '../../../store/auth/auth.selectors';
import { SyncOptions, SyncErrorType } from '../../models/tontine-sync.models';

describe('SequentialSyncManager', () => {
    let service: SequentialSyncManager;
    let httpMock: HttpTestingController;
    let dbService: MockedObject<DatabaseService>;
    let logService: MockedObject<LoggerService>;

    const mockToken = 'test-token-123';
    const apiUrl = environment.apiUrl + '/api/v1';

    const defaultOptions: SyncOptions = {
        forceCleanup: false,
        sessionId: 'session-123',
        commercialUsername: 'testuser',
        batchSize: 100
    };

    beforeEach(() => {
        const dbServiceSpy = {
            saveTontineMembers: vi.fn().mockName("DatabaseService.saveTontineMembers"),
            saveTontineDeliveries: vi.fn().mockName("DatabaseService.saveTontineDeliveries"),
            saveTontineCollections: vi.fn().mockName("DatabaseService.saveTontineCollections"),
            saveTontineStocks: vi.fn().mockName("DatabaseService.saveTontineStocks"),
            getUnsyncedCollectionsTotals: vi.fn().mockName("DatabaseService.getUnsyncedCollectionsTotals"),
            getUnsyncedLocalCollectionIds: vi.fn().mockName("DatabaseService.getUnsyncedLocalCollectionIds")
        };

        const logServiceSpy = {
            log: vi.fn().mockName("LoggerService.log")
        };

        TestBed.configureTestingModule({
            imports: [],
            providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
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
        dbService = TestBed.inject(DatabaseService) as MockedObject<DatabaseService>;
        dbService.getUnsyncedCollectionsTotals.mockReturnValue(Promise.resolve([]));
        dbService.getUnsyncedLocalCollectionIds.mockReturnValue(Promise.resolve([]));
        logService = TestBed.inject(LoggerService) as MockedObject<LoggerService>;
    });

    afterEach(() => {
        (service as any).collectionsSyncLock = false;
        (service as any).membersSyncLock = false;
        (service as any).stocksSyncLock = false;
        httpMock.verify();
    });

    describe('syncMembers', () => {
        it('should sync members from a single page successfully', async () => {
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

            dbService.saveTontineMembers.mockReturnValue(Promise.resolve());
            dbService.saveTontineDeliveries.mockReturnValue(Promise.resolve());

            let result: any;
            service.syncMembers(sessionId, defaultOptions).subscribe({
                next: (value) => result = value,
                error: (err: unknown) => expect.fail(String(err))
            });
            await new Promise((r) => setTimeout(r, 0));

            const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
            expect(req.request.method).toBe('GET');
            expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
            req.flush(mockResponse);
            await new Promise((r) => setTimeout(r, 0));

            expect(result.sessionId).toBe(sessionId);
            expect(result.totalPages).toBe(1);
            expect(result.processedPages).toBe(1);
            expect(result.totalItems).toBe(1);
            expect(result.savedItems).toBe(1);
            expect(result.errors.length).toBe(0);
            expect(dbService.saveTontineMembers).toHaveBeenCalledTimes(1);
        });

        it('should sync members from multiple pages sequentially', async () => {
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

            dbService.saveTontineMembers.mockReturnValue(Promise.resolve());
            dbService.saveTontineDeliveries.mockReturnValue(Promise.resolve());

            let result: any;
            service.syncMembers(sessionId, defaultOptions).subscribe({
                next: (value) => result = value,
                error: (err: unknown) => expect.fail(String(err))
            });
            await new Promise((r) => setTimeout(r, 0));

            const req1 = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
            req1.flush(mockPage1);
            await new Promise((r) => setTimeout(r, 0));

            const req2 = httpMock.expectOne(`${apiUrl}/tontines/members?page=1&size=100`);
            req2.flush(mockPage2);
            await new Promise((r) => setTimeout(r, 0));

            const req3 = httpMock.expectOne(`${apiUrl}/tontines/members?page=2&size=100`);
            req3.flush(mockPage3);
            await new Promise((r) => setTimeout(r, 0));

            expect(result.totalPages).toBe(3);
            expect(result.processedPages).toBe(3);
            expect(result.totalItems).toBe(3);
            expect(result.savedItems).toBe(3);
            expect(result.errors.length).toBe(0);
            expect(dbService.saveTontineMembers).toHaveBeenCalledTimes(3);
        });

        it('should adjust member totals with unsynced collections', async () => {
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

            dbService.getUnsyncedCollectionsTotals.mockReturnValue(Promise.resolve(unsyncedTotals));
            dbService.saveTontineMembers.mockReturnValue(Promise.resolve());

            service.syncMembers(sessionId, defaultOptions).subscribe({ error: (err: unknown) => expect.fail(String(err)) });
            await new Promise((r) => setTimeout(r, 0));

            const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
            req.flush(mockResponse);
            await new Promise((r) => setTimeout(r, 0));

            const savedMembers = vi.mocked(dbService.saveTontineMembers).mock.calls[0][0];
            expect(savedMembers[0].totalContribution).toBe(1500);
        });

        it('should prevent concurrent member synchronizations', async () => {
            const sessionId = 'session-123';

            dbService.saveTontineMembers.mockReturnValue(Promise.resolve());

            let concurrentError: any;
            service.syncMembers(sessionId, defaultOptions).subscribe();
            service.syncMembers(sessionId, defaultOptions).subscribe({
                next: () => expect.fail('Should have thrown an error'),
                error: (error) => concurrentError = error
            });

            expect(concurrentError.type).toBe(SyncErrorType.VALIDATION);
            expect(concurrentError.message).toContain('déjà en cours');

            await new Promise((r) => setTimeout(r, 0));
            const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
            req.flush({
                data: {
                    content: [],
                    page: { number: 0, totalPages: 1, totalElements: 0 }
                }
            });
            await new Promise((r) => setTimeout(r, 0));
        });

        it('should handle network errors gracefully', async () => {
            const sessionId = 'session-123';

            let error: any;
            service.syncMembers(sessionId, defaultOptions).subscribe({
                next: () => expect.fail('Should have thrown an error'),
                error: (err) => error = err
            });
            await new Promise((r) => setTimeout(r, 0));

            const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
            req.error(new ProgressEvent('Network error'));
            await new Promise((r) => setTimeout(r, 0));

            expect(error.type).toBe(SyncErrorType.NETWORK);
            expect(error.retryable).toBe(true);
        });

        it('should handle database errors gracefully', async () => {
            const sessionId = 'session-123';
            const mockResponse = {
                data: {
                    content: [{ id: 1, client: { id: 'c1' }, totalContribution: 100 }],
                    page: { number: 0, totalPages: 1, totalElements: 1 }
                }
            };

            dbService.saveTontineMembers.mockImplementation(() => Promise.reject(new Error('DB error')));

            let error: any;
            service.syncMembers(sessionId, defaultOptions).subscribe({
                next: () => expect.fail('Should have thrown an error'),
                error: (err) => error = err
            });
            await new Promise((r) => setTimeout(r, 0));

            const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
            req.flush(mockResponse);
            await new Promise((r) => setTimeout(r, 0));

            expect(error.type).toBe(SyncErrorType.DATABASE);
            expect(error.retryable).toBe(false);
        });

        it('should save deliveries when present in member data', async () => {
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

            dbService.saveTontineMembers.mockReturnValue(Promise.resolve());
            dbService.saveTontineDeliveries.mockReturnValue(Promise.resolve());

            service.syncMembers(sessionId, defaultOptions).subscribe({ error: (err: unknown) => expect.fail(String(err)) });
            await new Promise((r) => setTimeout(r, 0));

            const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
            req.flush(mockResponse);
            await new Promise((r) => setTimeout(r, 0));

            expect(dbService.saveTontineDeliveries).toHaveBeenCalledTimes(1);
            const savedDeliveries = vi.mocked(dbService.saveTontineDeliveries).mock.calls[0][0];
            expect(savedDeliveries.length).toBe(1);
            expect(savedDeliveries[0].id).toBe('d1');
            expect(savedDeliveries[0].items.length).toBe(1);
        });

        it('stores the member delivery status when the delivery payload has none', async () => {
            const sessionId = 'session-123';
            const mockResponse = {
                data: {
                    content: [{
                            id: 1,
                            client: { id: 'c1' },
                            totalContribution: 1000,
                            deliveryStatus: 'PENDING',
                            delivery: {
                                id: 'd-no-status',
                                requestDate: '2024-01-01',
                                deliveryDate: '2024-01-02',
                                totalAmount: 500,
                                items: []
                            }
                        }],
                    page: { number: 0, totalPages: 1, totalElements: 1 }
                }
            };

            dbService.saveTontineMembers.mockReturnValue(Promise.resolve());
            dbService.saveTontineDeliveries.mockReturnValue(Promise.resolve());

            service.syncMembers(sessionId, defaultOptions).subscribe({ error: (err: unknown) => expect.fail(String(err)) });
            await new Promise((r) => setTimeout(r, 0));

            const req = httpMock.expectOne(`${apiUrl}/tontines/members?page=0&size=100`);
            req.flush(mockResponse);
            await new Promise((r) => setTimeout(r, 0));

            const savedDeliveries = vi.mocked(dbService.saveTontineDeliveries).mock.lastCall![0];
            expect(savedDeliveries[0].status).toBe('PENDING');
        });
    });

    describe('syncCollections', () => {
        it('should sync collections from a single page successfully', async () => {
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

            dbService.saveTontineCollections.mockReturnValue(Promise.resolve());

            let result: any;
            service.syncCollections(defaultOptions).subscribe({
                next: (value) => result = value,
                error: (err: unknown) => expect.fail(String(err))
            });

            const req = httpMock.expectOne(`${apiUrl}/tontines/collections?page=0&size=100`);
            expect(req.request.method).toBe('GET');
            req.flush(mockResponse);
            await new Promise((r) => setTimeout(r, 0));

            expect(result.totalPages).toBe(1);
            expect(result.processedPages).toBe(1);
            expect(result.totalItems).toBe(1);
            expect(result.savedItems).toBe(1);
            expect(result.errors.length).toBe(0);
            expect(dbService.saveTontineCollections).toHaveBeenCalledTimes(1);
        });

        it('does not overwrite an unsynced local collection during pull', async () => {
            dbService.getUnsyncedLocalCollectionIds.mockReturnValue(Promise.resolve(['uuid-local']));
            dbService.saveTontineCollections.mockReturnValue(Promise.resolve());

            let result: any;
            service.syncCollections(defaultOptions).subscribe({
                next: (value) => result = value,
                error: (err: unknown) => expect.fail(String(err))
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
            await new Promise((r) => setTimeout(r, 0));

            expect(result.savedItems).toBe(0);
            expect(dbService.saveTontineCollections).not.toHaveBeenCalled();
        });

        it('should sync collections from multiple pages sequentially', async () => {
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

            dbService.saveTontineCollections.mockReturnValue(Promise.resolve());

            let result: any;
            service.syncCollections(defaultOptions).subscribe({
                next: (value) => result = value,
                error: (err: unknown) => expect.fail(String(err))
            });

            const req1 = httpMock.expectOne(`${apiUrl}/tontines/collections?page=0&size=100`);
            req1.flush(mockPage1);
            await new Promise((r) => setTimeout(r, 0));

            const req2 = httpMock.expectOne(`${apiUrl}/tontines/collections?page=1&size=100`);
            req2.flush(mockPage2);
            await new Promise((r) => setTimeout(r, 0));

            expect(result.totalPages).toBe(2);
            expect(result.processedPages).toBe(2);
            expect(result.savedItems).toBe(2);
            expect(dbService.saveTontineCollections).toHaveBeenCalledTimes(2);
        });

        it('should prevent concurrent collection synchronizations', async () => {
            dbService.saveTontineCollections.mockReturnValue(Promise.resolve());

            let concurrentError: any;
            service.syncCollections(defaultOptions).subscribe();
            service.syncCollections(defaultOptions).subscribe({
                next: () => expect.fail('Should have thrown an error'),
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
            await new Promise((r) => setTimeout(r, 0));
        });
    });

    describe('syncStocks', () => {
        it('should sync stocks successfully', async () => {
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

            dbService.saveTontineStocks.mockReturnValue(Promise.resolve());

            let result: any;
            service.syncStocks(sessionId, defaultOptions).subscribe({
                next: (value) => result = value,
                error: (err: unknown) => expect.fail(String(err))
            });

            const req = httpMock.expectOne(`${apiUrl}/tontines/stock`);
            expect(req.request.method).toBe('GET');
            req.flush(mockResponse);
            await new Promise((r) => setTimeout(r, 0));

            expect(result.sessionId).toBe(sessionId);
            expect(result.totalPages).toBe(1);
            expect(result.processedPages).toBe(1);
            expect(result.totalItems).toBe(1);
            expect(result.savedItems).toBe(1);
            expect(result.errors.length).toBe(0);
            expect(dbService.saveTontineStocks).toHaveBeenCalledTimes(1);
        });

        it('should handle empty stocks response', async () => {
            const sessionId = 'session-123';
            const mockResponse = {
                data: {
                    content: []
                }
            };

            dbService.saveTontineStocks.mockReturnValue(Promise.resolve());

            let result: any;
            service.syncStocks(sessionId, defaultOptions).subscribe({
                next: (value) => result = value,
                error: (err: unknown) => expect.fail(String(err))
            });

            const req = httpMock.expectOne(`${apiUrl}/tontines/stock`);
            req.flush(mockResponse);
            await new Promise((r) => setTimeout(r, 0));

            expect(result.totalItems).toBe(0);
            expect(result.savedItems).toBe(0);
            expect(result.processedPages).toBe(1);
        });

        it('should prevent concurrent stock synchronizations', async () => {
            const sessionId = 'session-123';

            dbService.saveTontineStocks.mockReturnValue(Promise.resolve());

            let concurrentError: any;
            service.syncStocks(sessionId, defaultOptions).subscribe();
            service.syncStocks(sessionId, defaultOptions).subscribe({
                next: () => expect.fail('Should have thrown an error'),
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
            await new Promise((r) => setTimeout(r, 0));
        });
    });
});
