import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OnlineListRefreshService } from './online-list-refresh.service';
import { ConnectivityService } from './connectivity.service';
import { HybridSyncPreferenceService } from './hybrid-sync-preference.service';
import { ClientRepository } from '../repositories/client.repository';
import { ClientRepositoryExtensions } from '../repositories/client.repository.extensions';
import { RecoveryRepository } from '../repositories/recovery.repository';
import { RecoveryRepositoryExtensions } from '../repositories/recovery.repository.extensions';
import { DistributionRepositoryExtensions } from '../repositories/distribution.repository.extensions';
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
  let connectivityService: jasmine.SpyObj<ConnectivityService>;
  let hybridSyncPreferenceService: jasmine.SpyObj<HybridSyncPreferenceService>;
  let localityRepository: jasmine.SpyObj<LocalityRepository>;
  let localityRepositoryExtensions: jasmine.SpyObj<LocalityRepositoryExtensions>;
  let tontineMemberRepositoryExtensions: jasmine.SpyObj<TontineMemberRepositoryExtensions>;
  let commercialStockRepository: jasmine.SpyObj<CommercialStockRepository>;
  let stockSnapshotRepository: jasmine.SpyObj<StockSnapshotRepository>;
  let articleRepository: jasmine.SpyObj<ArticleRepository>;
  let databaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    connectivityService = jasmine.createSpyObj('ConnectivityService', ['checkBackendReachable']);
    hybridSyncPreferenceService = jasmine.createSpyObj('HybridSyncPreferenceService', ['isHybridSyncEnabled']);
    localityRepository = jasmine.createSpyObj('LocalityRepository', ['saveAll']);
    localityRepositoryExtensions = jasmine.createSpyObj('LocalityRepositoryExtensions', ['findAllPaginated']);
    tontineMemberRepositoryExtensions = jasmine.createSpyObj('TontineMemberRepositoryExtensions', [
      'findBySessionAndCommercialPaginated'
    ]);
    commercialStockRepository = jasmine.createSpyObj('CommercialStockRepository', [
      'reconcileServerStock',
      'findAvailableArticlesPaginated'
    ]);
    stockSnapshotRepository = jasmine.createSpyObj('StockSnapshotRepository', ['upsertSnapshot']);
    articleRepository = jasmine.createSpyObj('ArticleRepository', ['saveAll']);
    databaseService = jasmine.createSpyObj('DatabaseService', [
      'getUnsyncedCollectionsTotals',
      'getUnsyncedLocalCollectionIds',
      'saveTontineMembers',
      'saveTontineDeliveries',
      'saveTontineCollections',
      'saveTontineStocks'
    ]);
    databaseService.getUnsyncedCollectionsTotals.and.resolveTo([]);
    databaseService.getUnsyncedLocalCollectionIds.and.resolveTo([]);
    databaseService.saveTontineMembers.and.resolveTo();
    databaseService.saveTontineDeliveries.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        OnlineListRefreshService,
        { provide: ConnectivityService, useValue: connectivityService },
        { provide: HybridSyncPreferenceService, useValue: hybridSyncPreferenceService },
        { provide: ClientRepository, useValue: {} },
        { provide: ClientRepositoryExtensions, useValue: {} },
        { provide: RecoveryRepository, useValue: {} },
        { provide: RecoveryRepositoryExtensions, useValue: {} },
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
        { provide: LoggerService, useValue: { log: jasmine.createSpy('log') } }
      ]
    });

    service = TestBed.inject(OnlineListRefreshService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('returns null when hybrid sync is disabled', async () => {
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(false);

    await expectAsync(service.refreshLocalitiesPage(0, 20)).toBeResolvedTo(null);
  });

  it('returns null when backend is unreachable', async () => {
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(true);
    connectivityService.checkBackendReachable.and.resolveTo(false);

    await expectAsync(service.refreshLocalitiesPage(0, 20)).toBeResolvedTo(null);
  });

  it('upserts localities and returns refreshed page when online', async () => {
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(true);
    connectivityService.checkBackendReachable.and.resolveTo(true);
    localityRepository.saveAll.and.resolveTo();
    const refreshedPage = { content: [{ id: '1', name: 'EKPAME' }], totalElements: 1, totalPages: 1, page: 0, size: 20 };
    localityRepositoryExtensions.findAllPaginated.and.resolveTo(refreshedPage as any);

    const refreshPromise = service.refreshLocalitiesPage(0, 20);

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

    await expectAsync(refreshPromise).toBeResolvedTo(refreshedPage as any);
    expect(localityRepository.saveAll).toHaveBeenCalled();
    expect(localityRepositoryExtensions.findAllPaginated).toHaveBeenCalledWith(0, 20, undefined);
  });

  it('refreshes tontine members page and preserves unsynced contribution delta', async () => {
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(true);
    connectivityService.checkBackendReachable.and.resolveTo(true);
    databaseService.getUnsyncedCollectionsTotals.and.resolveTo([
      { tontineMemberId: '10', total: 500 }
    ]);
    const refreshedPage = { content: [{ id: '10' }], totalElements: 1, totalPages: 1, page: 0, size: 20 };
    tontineMemberRepositoryExtensions.findBySessionAndCommercialPaginated.and.resolveTo(refreshedPage as any);

    const refreshPromise = service.refreshTontineMembersPage('session-1', 'com1', 0, 20);

    const req = httpMock.expectOne(
      `${environment.apiUrl}/api/v1/tontines/members?page=0&size=20&commercial=com1`
    );
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

    await expectAsync(refreshPromise).toBeResolvedTo(refreshedPage as any);
    expect(databaseService.saveTontineMembers).toHaveBeenCalledWith([
      jasmine.objectContaining({
        id: '10',
        totalContribution: 1500,
        isSync: true,
        isLocal: false
      })
    ]);
  });

  it('refreshes commercial stock page and returns reconciled articles when online', async () => {
    hybridSyncPreferenceService.isHybridSyncEnabled.and.resolveTo(true);
    connectivityService.checkBackendReachable.and.resolveTo(true);
    commercialStockRepository.reconcileServerStock.and.resolveTo();
    articleRepository.saveAll.and.resolveTo();
    stockSnapshotRepository.upsertSnapshot.and.resolveTo();
    const refreshedPage = {
      content: [{ id: '1', name: 'Article A', stockQuantity: 5 }],
      totalElements: 1,
      totalPages: 1
    };
    commercialStockRepository.findAvailableArticlesPaginated.and.resolveTo(refreshedPage as any);

    const refreshPromise = service.refreshCommercialStockPage('com1', 0, 20);

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

    await expectAsync(refreshPromise).toBeResolvedTo(refreshedPage as any);
    expect(commercialStockRepository.reconcileServerStock).toHaveBeenCalled();
    expect(articleRepository.saveAll).toHaveBeenCalled();
    expect(stockSnapshotRepository.upsertSnapshot).toHaveBeenCalledWith('com1', 5000);
    expect(commercialStockRepository.findAvailableArticlesPaginated).toHaveBeenCalledWith('com1', 0, 20, undefined);
  });
});
