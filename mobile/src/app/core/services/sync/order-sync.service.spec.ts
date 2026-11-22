import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import type { MockedObject } from "vitest";
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Store } from '@ngrx/store';
import { OrderSyncService } from './order-sync.service';
import { OrderRepository } from '../../repositories/order.repository';
import { OrderRepositoryExtensions } from '../../repositories/order.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { environment } from 'src/environments/environment';
import { Order } from '../../../models/order.model';
import * as OrderActions from '../../../store/order/order.actions';

describe('OrderSyncService', () => {
    let service: OrderSyncService;
    let httpMock: HttpTestingController;
    let repository: MockedObject<OrderRepository>;
    let store: MockedObject<Store>;

    const baseOrder = (overrides: Partial<Order> = {}): Order => ({
        id: 'uuid-order-1',
        reference: 'ORD-1',
        clientId: 'uuid-client-1',
        commercialId: 'COM002',
        totalAmount: 5000,
        status: 'PENDING',
        isLocal: true,
        isSync: false,
        createdAt: '2026-09-24T10:00:00.000Z',
        ...overrides
    } as Order);

    beforeEach(() => {
        repository = {
            getServerId: vi.fn().mockName("OrderRepository.getServerId"),
            saveIdMapping: vi.fn().mockName("OrderRepository.saveIdMapping"),
            markAsSynced: vi.fn().mockName("OrderRepository.markAsSynced"),
            updateSyncStatus: vi.fn().mockName("OrderRepository.updateSyncStatus"),
            getItemsForOrder: vi.fn().mockName("OrderRepository.getItemsForOrder")
        } as unknown as MockedObject<OrderRepository>;
        repository.getServerId.mockResolvedValue('42');
        repository.saveIdMapping.mockResolvedValue(undefined);
        repository.markAsSynced.mockResolvedValue(undefined);
        repository.getItemsForOrder.mockResolvedValue([
            {
                id: 'item-1',
                orderId: 'uuid-order-1',
                articleId: '11',
                quantity: 1,
                unitPrice: 5000,
                totalPrice: 5000
            }
        ]);

        store = {
            dispatch: vi.fn().mockName("Store.dispatch")
        } as unknown as MockedObject<Store>;

        TestBed.configureTestingModule({
            imports: [],
            providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
                OrderSyncService,
                { provide: OrderRepository, useValue: repository },
                {
                    provide: OrderRepositoryExtensions,
                    useValue: { findByCommercialPaginated: vi.fn() }
                },
                { provide: AuthService, useValue: { currentUser: { username: 'COM002', accessToken: 't' } } },
                { provide: SyncErrorService, useValue: { logSyncError: vi.fn() } },
                { provide: Store, useValue: store }
            ]
        });

        service = TestBed.inject(OrderSyncService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('rewrites local UUID via markAsSynced after successful push', async () => {
        const order = baseOrder();

        const promise = service.syncSingle(order);
        await new Promise((resolve) => setTimeout(resolve, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/orders`);
        expect(req.request.method).toBe('POST');
        req.flush({ data: { id: 9001, reference: 'ORD-1' } });
        await promise;

        expect(repository.saveIdMapping).toHaveBeenCalledWith('uuid-order-1', '9001', 'order');
        expect(repository.markAsSynced).toHaveBeenCalledWith('uuid-order-1', '9001');
        expect(repository.updateSyncStatus).not.toHaveBeenCalled();
        expect(store.dispatch).toHaveBeenCalledWith(OrderActions.orderSyncSuccess({ localId: 'uuid-order-1', serverId: '9001' }));
    });
});
