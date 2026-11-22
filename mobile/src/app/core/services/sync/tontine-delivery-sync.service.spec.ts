import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TontineDeliverySyncService } from './tontine-delivery-sync.service';
import { TontineDeliveryRepository } from '../../repositories/tontine-delivery.repository';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { environment } from 'src/environments/environment';
import { TontineDelivery } from '../../../models/tontine.model';

describe('TontineDeliverySyncService', () => {
    let service: TontineDeliverySyncService;
    let httpMock: HttpTestingController;
    let repository: MockedObject<TontineDeliveryRepository>;

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
        repository = {
            getServerId: vi.fn().mockName("TontineDeliveryRepository.getServerId"),
            saveIdMapping: vi.fn().mockName("TontineDeliveryRepository.saveIdMapping"),
            markAsSynced: vi.fn().mockName("TontineDeliveryRepository.markAsSynced"),
            markDeliverSynced: vi.fn().mockName("TontineDeliveryRepository.markDeliverSynced"),
            getItems: vi.fn().mockName("TontineDeliveryRepository.getItems"),
            findUnsynced: vi.fn().mockName("TontineDeliveryRepository.findUnsynced"),
            purgeSyncedOrphans: vi.fn().mockName("TontineDeliveryRepository.purgeSyncedOrphans"),
            purgePhantomDeliveries: vi.fn().mockName("TontineDeliveryRepository.purgePhantomDeliveries"),
            saveAll: vi.fn().mockName("TontineDeliveryRepository.saveAll"),
            replaceItems: vi.fn().mockName("TontineDeliveryRepository.replaceItems"),
            deleteLocalTwin: vi.fn().mockName("TontineDeliveryRepository.deleteLocalTwin"),
            setStatus: vi.fn().mockName("TontineDeliveryRepository.setStatus")
        } as unknown as MockedObject<TontineDeliveryRepository>;
        repository.setStatus.mockResolvedValue(undefined);
        repository.saveAll.mockResolvedValue(undefined);
        repository.replaceItems.mockResolvedValue(undefined);
        repository.deleteLocalTwin.mockResolvedValue(undefined);
        repository.getServerId.mockImplementation(async (localId: string, entityType: string) => {
            if (entityType === 'tontine-member') {
                return '42';
            }
            if (entityType === 'tontine-delivery') {
                return '9001';
            }
            return null;
        });
        repository.saveIdMapping.mockResolvedValue(undefined);
        repository.markAsSynced.mockResolvedValue(undefined);
        repository.markDeliverSynced.mockResolvedValue(undefined);
        repository.getItems.mockResolvedValue([]);
        repository.findUnsynced.mockResolvedValue([]);
        repository.purgeSyncedOrphans.mockResolvedValue(0);
        repository.purgePhantomDeliveries.mockResolvedValue(0);

        TestBed.configureTestingModule({
            imports: [],
            providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
                TontineDeliverySyncService,
                { provide: TontineDeliveryRepository, useValue: repository },
                { provide: AuthService, useValue: { currentUser: { username: 'COM002', accessToken: 't' } } },
                { provide: SyncErrorService, useValue: { logSyncError: vi.fn() } }
            ]
        });

        service = TestBed.inject(TontineDeliverySyncService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('posts PENDING/VALIDATED orders to POST /deliveries (no stock distribute)', async () => {
        const delivery = baseDelivery({ status: 'PENDING' });

        service.syncSingle(delivery).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));

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
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.saveIdMapping).toHaveBeenCalledWith('local-d1', '9001', 'tontine-delivery');
        expect(repository.markAsSynced).toHaveBeenCalledWith('local-d1', '9001');
        expect(repository.markDeliverSynced).not.toHaveBeenCalled();
    });

    it('replaces the local order by the server order when the server merged it into an existing one', async () => {
        const delivery = baseDelivery({ status: 'PENDING', reference: 'LIV-B' });

        service.syncSingle(delivery).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries`);
        req.flush({
            data: {
                id: 7001,
                tontineMemberId: 42,
                reference: 'LIV-A',
                deliveryStatus: 'PENDING',
                totalAmount: 35000,
                requestDate: '2026-11-02T09:00:00',
                mergedIntoExisting: true,
                items: [
                    { articleId: 5, quantity: 1, unitPrice: 30000, totalPrice: 30000, articleName: 'Huile' },
                    { articleId: 11, quantity: 1, unitPrice: 5000, totalPrice: 5000, articleName: 'Riz' }
                ]
            }
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.saveIdMapping).toHaveBeenCalledWith('local-d1', '7001', 'tontine-delivery');
        expect(repository.saveAll).toHaveBeenCalledWith([expect.objectContaining({
                id: '7001',
                reference: 'LIV-A',
                totalAmount: 35000,
                status: 'PENDING',
                isSync: true,
                isLocal: false
            })]);
        const [deliveryId, items, total] = vi.mocked(repository.replaceItems).mock.lastCall!;
        expect(deliveryId).toBe('7001');
        expect(items.length).toBe(2);
        expect(items[0].tontineDeliveryId).toBe('7001');
        expect(total).toBe(35000);
        expect(repository.deleteLocalTwin).toHaveBeenCalledWith('local-d1');
        // La ligne locale n'est pas renommée : une ligne 7001 peut déjà exister sur ce téléphone.
        expect(repository.markAsSynced).not.toHaveBeenCalled();
    });

    it('takes the VALIDATED status when the server validates orders automatically', async () => {
        const delivery = baseDelivery({ status: 'PENDING' });

        service.syncSingle(delivery).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));
        httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries`).flush({
            data: { id: 9003, tontineMemberId: 42, status: 'VALIDATED', deliveryStatus: 'VALIDATED', totalAmount: 5000 }
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.markAsSynced).toHaveBeenCalledWith('local-d1', '9003');
        expect(repository.setStatus).toHaveBeenCalledWith('9003', 'VALIDATED');
    });

    it('keeps the order pending when the server leaves it pending', async () => {
        const delivery = baseDelivery({ status: 'PENDING' });

        service.syncSingle(delivery).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));
        httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries`).flush({
            data: { id: 9004, tontineMemberId: 42, status: 'PENDING', deliveryStatus: 'PENDING', totalAmount: 5000 }
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.setStatus).not.toHaveBeenCalled();
    });

    it('sends the planned delivery date with the order', async () => {
        const delivery = baseDelivery({ status: 'PENDING', plannedDeliveryDate: '2026-12-15' });

        service.syncSingle(delivery).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));
        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries`);
        expect(req.request.body.plannedDeliveryDate).toBe('2026-12-15');
        req.flush({ data: { id: 9005, tontineMemberId: 42, status: 'PENDING', deliveryStatus: 'PENDING', totalAmount: 5000 } });
        await new Promise((r) => setTimeout(r, 0));
    });

    it('posts DELIVERED direct creation to POST /deliveries/distribute', async () => {
        const delivery = baseDelivery({ status: 'DELIVERED' });

        service.syncSingle(delivery).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));

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
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.markAsSynced).toHaveBeenCalledWith('local-d1', '9002');
    });

    it('patches needsDeliverSync orders via PATCH /deliveries/{id}/deliver', async () => {
        const delivery = baseDelivery({
            id: 'local-synced',
            status: 'DELIVERED',
            isSync: true,
            isLocal: false,
            needsDeliverSync: true
        });

        service.syncSingle(delivery).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));

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
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.markDeliverSynced).toHaveBeenCalledWith('local-synced');
        expect(repository.markAsSynced).not.toHaveBeenCalled();
    });

    it('posts VALIDATED orders to POST /deliveries like PENDING', async () => {
        const delivery = baseDelivery({ status: 'VALIDATED' });

        service.syncSingle(delivery).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries`);
        expect(req.request.method).toBe('POST');
        req.flush({ data: { id: 9003, status: 'VALIDATED', deliveryStatus: 'VALIDATED' } });
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.markAsSynced).toHaveBeenCalledWith('local-d1', '9003');
    });

    it('uses numeric delivery id for mark-delivered without mapping lookup', async () => {
        const delivery = baseDelivery({
            id: '9009',
            status: 'DELIVERED',
            isSync: true,
            needsDeliverSync: true
        });

        service.syncSingle(delivery).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries/9009/deliver`);
        expect(req.request.method).toBe('PATCH');
        req.flush({ data: { id: 9009, status: 'DELIVERED', deliveryStatus: 'DELIVERED' } });
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.getServerId).not.toHaveBeenCalledWith('9009', 'tontine-delivery');
        expect(repository.markDeliverSynced).toHaveBeenCalledWith('9009');
    });

    it('forwards the date filter to findUnsynced and syncs every row the repository returns', async () => {
        const dateFilter = { startDate: '2026-10-01', endDate: '2026-10-22' };
        const delivery = baseDelivery({
            requestDate: '2020-01-01T00:00:00.000Z',
            deliveryDate: '2020-01-01T00:00:00.000Z'
        });
        repository.findUnsynced.mockResolvedValue([delivery]);

        service.syncBatch(50, dateFilter).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.findUnsynced).toHaveBeenCalledWith('COM002', 50, 0, dateFilter);

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/deliveries`);
        expect(req.request.method).toBe('POST');
        req.flush({ data: { id: 9001, status: 'PENDING', deliveryStatus: 'PENDING' } });
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.markAsSynced).toHaveBeenCalledWith('local-d1', '9001');
    });
});
