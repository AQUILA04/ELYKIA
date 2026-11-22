import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import type { MockedObject } from "vitest";
import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
    let repository: MockedObject<DistributionRepository>;
    let store: MockedObject<Store>;

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
        repository = {
            getServerId: vi.fn().mockName("DistributionRepository.getServerId"),
            saveIdMapping: vi.fn().mockName("DistributionRepository.saveIdMapping"),
            markAsSynced: vi.fn().mockName("DistributionRepository.markAsSynced"),
            updateSyncStatus: vi.fn().mockName("DistributionRepository.updateSyncStatus"),
            getItemsForDistribution: vi.fn().mockName("DistributionRepository.getItemsForDistribution")
        } as unknown as MockedObject<DistributionRepository>;
        repository.getServerId.mockResolvedValue('42');
        repository.saveIdMapping.mockResolvedValue(undefined);
        repository.markAsSynced.mockResolvedValue(undefined);
        repository.getItemsForDistribution.mockResolvedValue([
            {
                id: 'item-1',
                distributionId: 'uuid-dist-1',
                articleId: '11',
                quantity: 1,
                unitPrice: 10000,
                totalPrice: 10000
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
                DistributionSyncService,
                { provide: DistributionRepository, useValue: repository },
                {
                    provide: DistributionRepositoryExtensions,
                    useValue: { findByCommercialPaginated: vi.fn() }
                },
                { provide: AuthService, useValue: { currentUser: { username: 'COM002', accessToken: 't' } } },
                { provide: SyncErrorService, useValue: { logSyncError: vi.fn() } },
                { provide: Store, useValue: store }
            ]
        });

        service = TestBed.inject(DistributionSyncService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('rewrites local UUID via markAsSynced after successful push', async () => {
        const distribution = baseDistribution();

        const promise = service.syncSingle(distribution);
        await new Promise((resolve) => setTimeout(resolve, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/credits/distribute-articles`);
        expect(req.request.method).toBe('PATCH');
        req.flush({ data: { id: 12345, reference: 'REF-1' } });
        await promise;

        expect(repository.saveIdMapping).toHaveBeenCalledWith('uuid-dist-1', '12345', 'distribution');
        expect(repository.markAsSynced).toHaveBeenCalledWith('uuid-dist-1', '12345');
        expect(repository.updateSyncStatus).not.toHaveBeenCalled();
        expect(store.dispatch).toHaveBeenCalledWith(DistributionActions.distributionSyncSuccess({ localId: 'uuid-dist-1', serverId: '12345' }));
    });
});
