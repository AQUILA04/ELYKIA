import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecoverySyncService } from './recovery-sync.service';
import { RecoveryRepository } from '../../repositories/recovery.repository';
import { RecoveryRepositoryExtensions } from '../../repositories/recovery.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { environment } from 'src/environments/environment';
import { Recovery } from '../../../models/recovery.model';

describe('RecoverySyncService (unified recovery batch)', () => {
    let service: RecoverySyncService;
    let httpMock: HttpTestingController;
    let repository: MockedObject<RecoveryRepository>;
    let repositoryExtensions: MockedObject<RecoveryRepositoryExtensions>;
    let syncErrorService: MockedObject<SyncErrorService>;

    const makeRecovery = (overrides: Partial<Recovery> = {}): Recovery => ({
        id: 'rec-local-1',
        amount: 500,
        paymentDate: '2026-11-27',
        paymentMethod: 'CASH',
        distributionId: 'dist-local-1',
        clientId: 'client-local-1',
        commercialId: 'COM002',
        isDefaultStake: true,
        isLocal: true,
        isSync: false,
        reliquatGeneratedAmount: 0,
        reliquatUsedAmount: 0,
        ...overrides
    } as Recovery);

    beforeEach(() => {
        repository = {
            getServerId: vi.fn(),
            markAsSynced: vi.fn().mockResolvedValue(undefined),
            findUnsyncedForClosedDistributions: vi.fn().mockResolvedValue([])
        } as unknown as MockedObject<RecoveryRepository>;

        repository.getServerId.mockImplementation(async (localId: string, entityType: string) => {
            if (entityType === 'distribution') {
                return localId === 'dist-local-2' ? '202' : '101';
            }
            if (entityType === 'client') {
                return localId === 'client-local-2' ? '22' : '11';
            }
            return null;
        });

        repositoryExtensions = {
            findByCommercialPaginated: vi.fn().mockResolvedValue({ content: [] })
        } as unknown as MockedObject<RecoveryRepositoryExtensions>;

        syncErrorService = {
            logSyncError: vi.fn().mockResolvedValue(undefined)
        } as unknown as MockedObject<SyncErrorService>;

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                RecoverySyncService,
                { provide: RecoveryRepository, useValue: repository },
                { provide: RecoveryRepositoryExtensions, useValue: repositoryExtensions },
                { provide: AuthService, useValue: { currentUser: { username: 'COM002', accessToken: 'tok' } } },
                { provide: SyncErrorService, useValue: syncErrorService }
            ]
        });

        service = TestBed.inject(RecoverySyncService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('syncBatch sends both default and special stakes in a single POST /api/v1/credits/recoveries/batch with explicit amounts', async () => {
        const defaultRec = makeRecovery({ id: 'rec-default-1', amount: 500, isDefaultStake: true });
        const specialRec = makeRecovery({
            id: 'rec-special-2',
            amount: 1250,
            isDefaultStake: false,
            distributionId: 'dist-local-2',
            clientId: 'client-local-2',
            reliquatGeneratedAmount: 50
        });
        repositoryExtensions.findByCommercialPaginated.mockResolvedValue({ content: [defaultRec, specialRec] } as any);

        const promise = service.syncBatch(100);
        await new Promise((resolve) => setTimeout(resolve, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/credits/recoveries/batch`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({
            collector: 'COM002',
            syncConsentCode: null,
            source: 'MOBILE_SYNC',
            recoveries: [
                {
                    creditId: 101,
                    clientId: 11,
                    amount: 500,
                    recoveryId: 'rec-default-1',
                    reliquatGeneratedAmount: 0,
                    reliquatUsedAmount: 0,
                    operationConsentCode: null,
                    confirmedAmount: null
                },
                {
                    creditId: 202,
                    clientId: 22,
                    amount: 1250,
                    recoveryId: 'rec-special-2',
                    reliquatGeneratedAmount: 50,
                    reliquatUsedAmount: 0,
                    operationConsentCode: null,
                    confirmedAmount: null
                }
            ]
        });

        req.flush({
            data: {
                successRecoveryIds: ['rec-default-1', 'rec-special-2'],
                failedRecoveries: []
            }
        });

        const result = await promise;
        expect(result).toEqual({ success: 2, errors: 0, failedIds: [] });
        expect(repository.markAsSynced).toHaveBeenCalledWith('rec-default-1');
        expect(repository.markAsSynced).toHaveBeenCalledWith('rec-special-2');
    });

    it('postCreateRecovery sends online-first recovery to /api/v1/credits/recoveries/batch with explicit amount', async () => {
        const rec = makeRecovery({ id: 'rec-online-1', amount: 500, isDefaultStake: true });

        const promise = service.postCreateRecovery(rec);
        await new Promise((resolve) => setTimeout(resolve, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/credits/recoveries/batch`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body.recoveries[0].amount).toBe(500);
        expect(req.request.body.recoveries[0].recoveryId).toBe('rec-online-1');

        req.flush({
            data: {
                successRecoveryIds: ['rec-online-1'],
                failedRecoveries: []
            }
        });

        await expect(promise).resolves.toBeUndefined();
        expect(repository.markAsSynced).not.toHaveBeenCalled();
    });
});
