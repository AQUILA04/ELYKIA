import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TontineDeliverySyncService } from './tontine-delivery-sync.service';
import { TontineDeliveryRepository } from '../../repositories/tontine-delivery.repository';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { environment } from 'src/environments/environment';
import { TontineDelivery } from '../../../models/tontine.model';

describe('TontineDeliverySyncService', () => {
  let service: TontineDeliverySyncService;
  let httpMock: HttpTestingController;
  let repository: jasmine.SpyObj<TontineDeliveryRepository>;

  const baseDelivery = (overrides: Partial<TontineDelivery> = {}): TontineDelivery => ({
    id: 'local-d1',
    tontineMemberId: 'local-m1',
    commercialUsername: 'COM002',
    requestDate: '2026-09-17T10:00:00.000Z',
    deliveryDate: '2026-09-17T10:00:00.000Z',
    status: 'PENDING',
    totalAmount: 5000,
    isLocal: true,
    isSync: false,
    needsDeliverSync: false,
    items: [
      {
        id: 'item-1',
        tontineDeliveryId: 'local-d1',
        articleId: '11',
        quantity: 1,
        unitPrice: 5000,
        totalPrice: 5000
      }
    ],
    ...overrides
  });

  beforeEach(() => {
    repository = jasmine.createSpyObj('TontineDeliveryRepository', [
      'getServerId',
      'saveIdMapping',
      'markAsSynced',
      'markDeliverSynced',
      'getItems',
      'findUnsynced'
    ]);
    repository.getServerId.and.callFake(async (localId: string, entityType: string) => {
      if (entityType === 'tontine-member') {
        return '42';
      }
      if (entityType === 'tontine-delivery') {
        return '9001';
      }
      return null;
    });
    repository.saveIdMapping.and.resolveTo();
    repository.markAsSynced.and.resolveTo();
    repository.markDeliverSynced.and.resolveTo();
    repository.getItems.and.resolveTo([]);
    repository.findUnsynced.and.resolveTo([]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TontineDeliverySyncService,
        { provide: TontineDeliveryRepository, useValue: repository },
        { provide: AuthService, useValue: { currentUser: { username: 'COM002', accessToken: 't' } } },
        { provide: SyncErrorService, useValue: { logSyncError: jasmine.createSpy('logSyncError') } }
      ]
    });

    service = TestBed.inject(TontineDeliverySyncService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts PENDING/VALIDATED orders to POST /deliveries (no stock distribute)', fakeAsync(() => {
    const delivery = baseDelivery({ status: 'PENDING' });

    service.syncSingle(delivery).then(() => undefined);
    flushMicrotasks();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.tontineMemberId).toBe(42);
    expect(req.request.body.items.length).toBe(1);

    req.flush({
      data: {
        id: 9001,
        tontineMemberId: 42,
        status: 'PENDING',
        deliveryStatus: 'PENDING',
        totalAmount: 5000,
        requestDate: delivery.requestDate,
        deliveryDate: delivery.deliveryDate
      }
    });
    flushMicrotasks();

    expect(repository.saveIdMapping).toHaveBeenCalledWith('local-d1', '9001', 'tontine-delivery');
    expect(repository.markAsSynced).toHaveBeenCalledWith('local-d1', '9001');
    expect(repository.markDeliverSynced).not.toHaveBeenCalled();
  }));

  it('posts DELIVERED direct creation to POST /deliveries/distribute', fakeAsync(() => {
    const delivery = baseDelivery({ status: 'DELIVERED' });

    service.syncSingle(delivery).then(() => undefined);
    flushMicrotasks();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries/distribute`);
    expect(req.request.method).toBe('POST');

    req.flush({
      data: {
        id: 9002,
        tontineMemberId: 42,
        status: 'DELIVERED',
        deliveryStatus: 'DELIVERED',
        totalAmount: 5000
      }
    });
    flushMicrotasks();

    expect(repository.markAsSynced).toHaveBeenCalledWith('local-d1', '9002');
  }));

  it('patches needsDeliverSync orders via PATCH /deliveries/{id}/deliver', fakeAsync(() => {
    const delivery = baseDelivery({
      id: 'local-synced',
      status: 'DELIVERED',
      isSync: true,
      isLocal: false,
      needsDeliverSync: true
    });

    service.syncSingle(delivery).then(() => undefined);
    flushMicrotasks();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries/9001/deliver`);
    expect(req.request.method).toBe('PATCH');

    req.flush({
      data: {
        id: 9001,
        status: 'DELIVERED',
        deliveryStatus: 'DELIVERED',
        deliveryDate: '2026-09-18T12:00:00.000Z'
      }
    });
    flushMicrotasks();

    expect(repository.markDeliverSynced).toHaveBeenCalledWith('local-synced');
    expect(repository.markAsSynced).not.toHaveBeenCalled();
  }));

  it('posts VALIDATED orders to POST /deliveries like PENDING', fakeAsync(() => {
    const delivery = baseDelivery({ status: 'VALIDATED' });

    service.syncSingle(delivery).then(() => undefined);
    flushMicrotasks();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { id: 9003, status: 'VALIDATED', deliveryStatus: 'VALIDATED' } });
    flushMicrotasks();

    expect(repository.markAsSynced).toHaveBeenCalledWith('local-d1', '9003');
  }));

  it('uses numeric delivery id for mark-delivered without mapping lookup', fakeAsync(() => {
    const delivery = baseDelivery({
      id: '9009',
      status: 'DELIVERED',
      isSync: true,
      needsDeliverSync: true
    });

    service.syncSingle(delivery).then(() => undefined);
    flushMicrotasks();

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries/9009/deliver`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ data: { id: 9009, status: 'DELIVERED', deliveryStatus: 'DELIVERED' } });
    flushMicrotasks();

    expect(repository.getServerId).not.toHaveBeenCalledWith('9009', 'tontine-delivery');
    expect(repository.markDeliverSynced).toHaveBeenCalledWith('9009');
  }));
});
