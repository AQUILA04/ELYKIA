import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OnlineListRefreshService } from './online-list-refresh.service';
import { ConnectivityService } from './connectivity.service';
import { HybridSyncPreferenceService } from './hybrid-sync-preference.service';
import { ClientRepository } from '../repositories/client.repository';
import { ClientRepositoryExtensions } from '../repositories/client.repository.extensions';
import { RecoveryRepository } from '../repositories/recovery.repository';
import { RecoveryRepositoryExtensions } from '../repositories/recovery.repository.extensions';
import { DistributionRepositoryExtensions } from '../repositories/distribution.repository.extensions';
import { DistributionRepository } from '../repositories/distribution.repository';
import { LocalityRepository } from '../repositories/locality.repository';
import { LocalityRepositoryExtensions } from '../repositories/locality.repository.extensions';
import { TontineMemberRepositoryExtensions } from '../repositories/tontine-member.repository.extensions';
import { TontineCollectionRepositoryExtensions } from '../repositories/tontine-collection.repository.extensions';
import { TontineDeliveryRepositoryExtensions } from '../repositories/tontine-delivery.repository.extensions';
import { TontineStockRepositoryExtensions } from '../repositories/tontine-stock.repository.extensions';
import { CommercialStockRepository } from '../repositories/commercial-stock.repository';
import { StockSnapshotRepository } from '../repositories/stock-snapshot.repository';
import { ArticleRepository } from '../repositories/article.repository';
import { DatabaseService } from './database.service';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';

describe('OnlineListRefreshService', () => {
    let service: OnlineListRefreshService;
    let httpMock: HttpTestingController;
    let connectivityService: MockedObject<ConnectivityService>;
    let hybridSyncPreferenceService: MockedObject<HybridSyncPreferenceService>;
    let localityRepository: MockedObject<LocalityRepository>;
    let localityRepositoryExtensions: MockedObject<LocalityRepositoryExtensions>;
    let tontineMemberRepositoryExtensions: MockedObject<TontineMemberRepositoryExtensions>;
    let commercialStockRepository: MockedObject<CommercialStockRepository>;
    let stockSnapshotRepository: MockedObject<StockSnapshotRepository>;
    let articleRepository: MockedObject<ArticleRepository>;
    let databaseService: MockedObject<DatabaseService>;

    beforeEach(() => {
        connectivityService = {
            checkBackendReachable: vi.fn().mockName("ConnectivityService.checkBackendReachable")
        } as unknown as MockedObject<ConnectivityService>;
        hybridSyncPreferenceService = {
            isHybridSyncEnabled: vi.fn().mockName("HybridSyncPreferenceService.isHybridSyncEnabled")
        } as unknown as MockedObject<HybridSyncPreferenceService>;
        localityRepository = {
            saveAll: vi.fn().mockName("LocalityRepository.saveAll")
        } as unknown as MockedObject<LocalityRepository>;
        localityRepositoryExtensions = {
            findAllPaginated: vi.fn().mockName("LocalityRepositoryExtensions.findAllPaginated")
        } as unknown as MockedObject<LocalityRepositoryExtensions>;
        tontineMemberRepositoryExtensions = {
            findBySessionAndCommercialPaginated: vi.fn().mockName("TontineMemberRepositoryExtensions.findBySessionAndCommercialPaginated")
        } as unknown as MockedObject<TontineMemberRepositoryExtensions>;
        commercialStockRepository = {
            reconcileServerStock: vi.fn().mockName("CommercialStockRepository.reconcileServerStock"),
            findAvailableArticlesPaginated: vi.fn().mockName("CommercialStockRepository.findAvailableArticlesPaginated")
        } as unknown as MockedObject<CommercialStockRepository>;
        stockSnapshotRepository = {
            upsertSnapshot: vi.fn().mockName("StockSnapshotRepository.upsertSnapshot")
        } as unknown as MockedObject<StockSnapshotRepository>;
        articleRepository = {
            saveAll: vi.fn().mockName("ArticleRepository.saveAll"),
            findByIds: vi.fn().mockName("ArticleRepository.findByIds"),
            searchCatalogueArticles: vi.fn().mockName("ArticleRepository.searchCatalogueArticles"),
            markMissingEnabledAsDisabled: vi.fn().mockName("ArticleRepository.markMissingEnabledAsDisabled")
        } as unknown as MockedObject<ArticleRepository>;
        databaseService = {
            getUnsyncedCollectionsTotals: vi.fn().mockName("DatabaseService.getUnsyncedCollectionsTotals"),
            getUnsyncedLocalCollectionIds: vi.fn().mockName("DatabaseService.getUnsyncedLocalCollectionIds"),
            saveTontineMembers: vi.fn().mockName("DatabaseService.saveTontineMembers"),
            saveTontineDeliveries: vi.fn().mockName("DatabaseService.saveTontineDeliveries"),
            saveTontineCollections: vi.fn().mockName("DatabaseService.saveTontineCollections"),
            saveTontineStocks: vi.fn().mockName("DatabaseService.saveTontineStocks")
        } as unknown as MockedObject<DatabaseService>;
        databaseService.getUnsyncedCollectionsTotals.mockResolvedValue([]);
        databaseService.getUnsyncedLocalCollectionIds.mockResolvedValue([]);
        databaseService.saveTontineMembers.mockResolvedValue(undefined);
        databaseService.saveTontineDeliveries.mockResolvedValue(undefined);
        articleRepository.findByIds.mockResolvedValue([]);
        articleRepository.saveAll.mockResolvedValue(undefined);
        articleRepository.markMissingEnabledAsDisabled.mockResolvedValue(undefined);
        articleRepository.searchCatalogueArticles.mockResolvedValue({
            content: [],
            totalElements: 0,
            totalPages: 0,
            page: 0,
            size: 20
        });

        TestBed.configureTestingModule({
            imports: [],
            providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
                OnlineListRefreshService,
                { provide: ConnectivityService, useValue: connectivityService },
                { provide: HybridSyncPreferenceService, useValue: hybridSyncPreferenceService },
                { provide: ClientRepository, useValue: {} },
                { provide: ClientRepositoryExtensions, useValue: {} },
                { provide: RecoveryRepository, useValue: {} },
                { provide: RecoveryRepositoryExtensions, useValue: {} },
                {
                    provide: DistributionRepository,
                    useValue: {
                        reconcileIncomingServerDistributions: vi.fn().mockResolvedValue(0),
                        healSyncedLocalDuplicates: vi.fn().mockResolvedValue(0)
                    }
                },
                { provide: DistributionRepositoryExtensions, useValue: {} },
                { provide: LocalityRepository, useValue: localityRepository },
                { provide: LocalityRepositoryExtensions, useValue: localityRepositoryExtensions },
                { provide: TontineMemberRepositoryExtensions, useValue: tontineMemberRepositoryExtensions },
                { provide: TontineCollectionRepositoryExtensions, useValue: {} },
                { provide: TontineDeliveryRepositoryExtensions, useValue: {} },
                { provide: TontineStockRepositoryExtensions, useValue: {} },
                { provide: CommercialStockRepository, useValue: commercialStockRepository },
                { provide: StockSnapshotRepository, useValue: stockSnapshotRepository },
                { provide: ArticleRepository, useValue: articleRepository },
                { provide: DatabaseService, useValue: databaseService },
                { provide: LoggerService, useValue: { log: vi.fn() } }
            ]
        });

        service = TestBed.inject(OnlineListRefreshService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('returns null when hybrid sync is disabled', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(false);

        await expect(service.refreshLocalitiesPage(0, 20)).resolves.toEqual(null);
    });

    it('returns null when backend is unreachable', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);
        connectivityService.checkBackendReachable.mockResolvedValue(false);

        await expect(service.refreshLocalitiesPage(0, 20)).resolves.toEqual(null);
    });

    it('upserts localities and returns refreshed page when online', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);
        connectivityService.checkBackendReachable.mockResolvedValue(true);
        localityRepository.saveAll.mockResolvedValue(undefined);
        const refreshedPage = { content: [{ id: '1', name: 'EKPAME' }], totalElements: 1, totalPages: 1, page: 0, size: 20 };
        localityRepositoryExtensions.findAllPaginated.mockResolvedValue(refreshedPage as any);

        let result: any;
        service.refreshLocalitiesPage(0, 20).then((page) => { result = page; });
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/localities?page=0&size=20&sort=name,asc`);
        expect(req.request.method).toBe('GET');
        req.flush({
            data: {
                content: [{ id: 1, name: 'EKPAME' }],
                totalElements: 1,
                totalPages: 1,
                number: 0
            }
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(result).toEqual(refreshedPage as any);
        expect(localityRepository.saveAll).toHaveBeenCalled();
        expect(localityRepositoryExtensions.findAllPaginated).toHaveBeenCalledWith(0, 20, undefined);
    });

    it('refreshes tontine members page and preserves unsynced contribution delta', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);
        connectivityService.checkBackendReachable.mockResolvedValue(true);
        databaseService.getUnsyncedCollectionsTotals.mockResolvedValue([
            { tontineMemberId: '10', total: 500 }
        ]);
        const refreshedPage = { content: [{ id: '10' }], totalElements: 1, totalPages: 1, page: 0, size: 20 };
        tontineMemberRepositoryExtensions.findBySessionAndCommercialPaginated.mockResolvedValue(refreshedPage as any);

        let result: any;
        service.refreshTontineMembersPage('session-1', 'com1', 0, 20).then((page) => { result = page; });
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/members?page=0&size=20&commercial=com1`);
        req.flush({
            data: {
                content: [{
                        id: 10,
                        client: { id: 99 },
                        totalContribution: 1000,
                        deliveryStatus: 'PENDING',
                        registrationDate: '2026-01-01',
                        frequency: 'DAILY',
                        amount: 100
                    }],
                page: { number: 0, totalPages: 1, totalElements: 1 }
            }
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(result).toEqual(refreshedPage as any);
        expect(databaseService.saveTontineMembers).toHaveBeenCalledWith([
            expect.objectContaining({
                id: '10',
                totalContribution: 1500,
                isSync: true,
                isLocal: false
            })
        ]);
    });

    it('refreshes commercial stock page and returns reconciled articles when online', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);
        connectivityService.checkBackendReachable.mockResolvedValue(true);
        commercialStockRepository.reconcileServerStock.mockResolvedValue(undefined);
        articleRepository.saveAll.mockResolvedValue(undefined);
        stockSnapshotRepository.upsertSnapshot.mockResolvedValue(undefined);
        const refreshedPage = {
            content: [{ id: '1', name: 'Article A', stockQuantity: 5 }],
            totalElements: 1,
            totalPages: 1
        };
        commercialStockRepository.findAvailableArticlesPaginated.mockResolvedValue(refreshedPage as any);

        let result: any;
        service.refreshCommercialStockPage('com1', 0, 20).then((page) => { result = page; });
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/commercial-stocks/available/com1`);
        expect(req.request.method).toBe('GET');
        req.flush([
            {
                articleId: '1',
                articleName: 'Article A',
                creditSalePrice: 1000,
                quantityRemaining: 5
            }
        ]);
        await new Promise((r) => setTimeout(r, 0));

        expect(result).toEqual({ ...refreshedPage, page: 0, size: 20 } as any);
        expect(commercialStockRepository.reconcileServerStock).toHaveBeenCalled();
        expect(articleRepository.saveAll).toHaveBeenCalled();
        expect(stockSnapshotRepository.upsertSnapshot).toHaveBeenCalledWith('com1', 5000);
        expect(commercialStockRepository.findAvailableArticlesPaginated).toHaveBeenCalledWith('com1', 0, 20, undefined);
    });

    it('refreshes catalogue from enabled/all on first page and reconciles disabled', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);
        connectivityService.checkBackendReachable.mockResolvedValue(true);
        articleRepository.findByIds.mockResolvedValue([{ id: '1', stockQuantity: 3 } as any]);
        const refreshedPage = {
            content: [{ id: '1', name: 'Article A', creditSalePrice: 1000, state: 'ENABLED' }],
            totalElements: 1,
            totalPages: 1,
            page: 0,
            size: 20
        };
        articleRepository.searchCatalogueArticles.mockResolvedValue(refreshedPage as any);

        let result: any;
        service.refreshArticlesCataloguePage(0, 20).then((page) => { result = page; });
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/articles/enabled/all`);
        expect(req.request.method).toBe('GET');
        req.flush({
            data: [{ id: 1, name: 'Article A', commercialName: 'Article A', creditSalePrice: 1000, state: 'ENABLED' }]
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(result).toEqual(refreshedPage as any);
        expect(articleRepository.saveAll).toHaveBeenCalledWith([
            expect.objectContaining({
                id: '1',
                stockQuantity: 3,
                state: 'ENABLED'
            })
        ]);
        expect(articleRepository.markMissingEnabledAsDisabled).toHaveBeenCalledWith(['1']);
        expect(articleRepository.searchCatalogueArticles).toHaveBeenCalledWith(0, 20, undefined);
    });

    it('searches enabled catalogue via elasticsearch when query is set', async () => {
        hybridSyncPreferenceService.isHybridSyncEnabled.mockResolvedValue(true);
        connectivityService.checkBackendReachable.mockResolvedValue(true);
        articleRepository.findByIds.mockResolvedValue([]);
        const refreshedPage = {
            content: [{ id: '2', name: 'Moto' }],
            totalElements: 1,
            totalPages: 1,
            page: 0,
            size: 20
        };
        articleRepository.searchCatalogueArticles.mockResolvedValue(refreshedPage as any);

        let result: any;
        service.refreshArticlesCataloguePage(0, 20, { searchQuery: 'moto' }).then((page) => { result = page; });
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/articles/elasticsearch/enabled?page=0&size=20`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ keyword: 'moto' });
        req.flush({
            data: { content: [{ id: 2, name: 'Moto', creditSalePrice: 500, state: 'ENABLED' }] }
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(result).toEqual(refreshedPage as any);
        expect(articleRepository.markMissingEnabledAsDisabled).not.toHaveBeenCalled();
    });
});
