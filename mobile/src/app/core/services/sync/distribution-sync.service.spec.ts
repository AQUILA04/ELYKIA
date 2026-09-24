import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Store } from '@ngrx/store';
import { DistributionSyncService } from './distribution-sync.service';
import { DistributionRepository } from '../../repositories/distribution.repository';
import { DistributionRepositoryExtensions } from '../../repositories/distribution.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { environment } from 'src/environments/environment';
import { Distribution } from '../../../models/distribution.model';
import * as DistributionActions from '../../../store/distribution/distribution.actions';

describe('DistributionSyncService', () => {
  let service: DistributionSyncService;
  let httpMock: HttpTestingController;
  let repository: jasmine.SpyObj<DistributionRepository>;
  let store: jasmine.SpyObj<Store>;

  const baseDistribution = (overrides: Partial<Distribution> = {}): Distribution => ({
    id: 'uuid-dist-1',
    reference: 'REF-1',
    creditId: '0',
    totalAmount: 10000,
    dailyPayment: 500,
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    status: 'INPROGRESS',
    clientId: 'uuid-client-1',
    commercialId: 'COM002',
    isLocal: true,
    isSync: false,
    syncDate: '',
    createdAt: '2026-09-01T00:00:00.000Z',
    paidAmount: 0,
    remainingAmount: 10000,
    advance: 0,
    articleCount: 1,
    ...overrides
  } as Distribution);

  beforeEach(() => {
    repository = jasmine.createSpyObj('DistributionRepository', [
      'getServerId',
      'saveIdMapping',
      'markAsSynced',
      'updateSyncStatus',
      'getItemsForDistribution'
    ]);
    repository.getServerId.and.resolveTo('42');
    repository.saveIdMapping.and.resolveTo();
    repository.markAsSynced.and.resolveTo();
    repository.getItemsForDistribution.and.resolveTo([
      {
        id: 'item-1',
        distributionId: 'uuid-dist-1',
        articleId: '11',
        quantity: 1,
        unitPrice: 10000,
        totalPrice: 10000
      }
    ]);

    store = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DistributionSyncService,
        { provide: DistributionRepository, useValue: repository },
        {
          provide: DistributionRepositoryExtensions,
          useValue: { findByCommercialPaginated: jasmine.createSpy('findByCommercialPaginated') }
        },
        { provide: AuthService, useValue: { currentUser: { username: 'COM002', accessToken: 't' } } },
        { provide: SyncErrorService, useValue: { logSyncError: jasmine.createSpy('logSyncError') } },
        { provide: Store, useValue: store }
      ]
    });

    service = TestBed.inject(DistributionSyncService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('rewrites local UUID via markAsSynced after successful push', fakeAsync(() => {
    const distribution = baseDistribution();

    service.syncSingle(distribution).then(() => undefined);
    flushMicrotasks();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/credits/distribute-articles`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ data: { id: 12345, reference: 'REF-1' } });
    flushMicrotasks();

    expect(repository.saveIdMapping).toHaveBeenCalledWith('uuid-dist-1', '12345', 'distribution');
    expect(repository.markAsSynced).toHaveBeenCalledWith('uuid-dist-1', '12345');
    expect(repository.updateSyncStatus).not.toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalledWith(
      DistributionActions.distributionSyncSuccess({ localId: 'uuid-dist-1', serverId: '12345' })
    );
  }));
});
