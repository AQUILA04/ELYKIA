import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import type { Mock, MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TontineCollectionSyncService } from './tontine-collection-sync.service';
import { TontineCollectionRepository } from '../../repositories/tontine-collection.repository';
import { TontineCollectionRepositoryExtensions } from '../../repositories/tontine-collection.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { environment } from 'src/environments/environment';
import { TontineCollection } from '../../../models/tontine.model';

describe('TontineCollectionSyncService', () => {
    let service: TontineCollectionSyncService;
    let httpMock: HttpTestingController;
    let repository: MockedObject<TontineCollectionRepository>;
    let extensions: {
        findByCommercialPaginated: Mock;
    };

    beforeEach(() => {
        repository = {
            getServerId: vi.fn().mockName("TontineCollectionRepository.getServerId"),
            saveIdMapping: vi.fn().mockName("TontineCollectionRepository.saveIdMapping"),
            saveAll: vi.fn().mockName("TontineCollectionRepository.saveAll"),
            markAsSynced: vi.fn().mockName("TontineCollectionRepository.markAsSynced"),
            purgeSyncedOrphans: vi.fn().mockName("TontineCollectionRepository.purgeSyncedOrphans")
        } as unknown as MockedObject<TontineCollectionRepository>;
        repository.getServerId.mockResolvedValue('42');
        repository.saveIdMapping.mockResolvedValue(undefined);
        repository.saveAll.mockResolvedValue(undefined);
        repository.markAsSynced.mockResolvedValue(undefined);
        repository.purgeSyncedOrphans.mockResolvedValue(0);

        extensions = {
            findByCommercialPaginated: vi.fn().mockResolvedValue({ content: [], totalElements: 0 })
        };

        TestBed.configureTestingModule({
            imports: [],
            providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
                TontineCollectionSyncService,
                { provide: TontineCollectionRepository, useValue: repository },
                { provide: TontineCollectionRepositoryExtensions, useValue: extensions },
                { provide: AuthService, useValue: { currentUser: { username: 'COM002', accessToken: 't' } } },
                { provide: SyncErrorService, useValue: { logSyncError: vi.fn() } }
            ]
        });

        service = TestBed.inject(TontineCollectionSyncService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('rewrites local UUID via markAsSynced then persists server allocation fields on the same id', async () => {
        const collection: TontineCollection = {
            id: 'uuid-1',
            tontineMemberId: '42',
            amount: 5000,
            collectionDate: '2026-03-15T08:00:00.000Z',
            isLocal: true,
            isSync: false,
            advanceToNextMonth: false
        };

        let persisted: any;
        service.syncSingle(collection).then(result => persisted = result);
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/collections`);
        expect(req.request.body.collectionDate).toBe('2026-03-15');
        expect(req.request.body.advanceToNextMonth).toBe(false);
        expect(req.request.body.reference).toBe('uuid-1');

        req.flush({
            data: {
                id: 99,
                amount: 5000,
                collectionDate: '2026-03-15T00:00:00',
                societyShareAmount: 1000,
                contributionMonth: '2026-03-01',
                advanceToNextMonth: false
            }
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.saveIdMapping).toHaveBeenCalledWith('uuid-1', '99', 'tontine-collection');
        expect(repository.markAsSynced).toHaveBeenCalledWith('uuid-1', '99');
        expect(repository.saveAll).toHaveBeenCalled();
        const saved = vi.mocked(repository.saveAll).mock.lastCall![0][0];
        expect(saved.id).toBe('99');
        expect(saved.societyShareAmount).toBe(1000);
        expect(saved.contributionMonth).toBe('2026-03-01');
        expect(saved.isSync).toBe(true);
        expect(saved.isLocal).toBe(false);
        expect(persisted.id).toBe(99);
    });

    it('omits collectionDate when the collecte is today so the server does not treat it as catch-up', async () => {
        const now = new Date();
        const today = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');
        const collection: TontineCollection = {
            id: 'uuid-today',
            tontineMemberId: '42',
            amount: 1000,
            collectionDate: `${today}T10:00:00.000Z`,
            isLocal: true,
            isSync: false
        };

        service.syncSingle(collection).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/collections`);
        expect(req.request.body.collectionDate).toBeUndefined();
        req.flush({ data: { id: 100, amount: 1000, collectionDate: `${today}T10:00:00` } });
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.markAsSynced).toHaveBeenCalledWith('uuid-today', '100');
    });

    it('keeps the local collection when the backend returns a business error', async () => {
        const collection: TontineCollection = {
            id: 'uuid-err',
            tontineMemberId: '42',
            amount: 5000,
            collectionDate: '2026-03-15',
            isLocal: true,
            isSync: false
        };

        let caught: any;
        service.syncSingle(collection).catch(error => caught = error);
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/collections`);
        req.flush({ message: 'Session en migration' }, { status: 400, statusText: 'Bad Request' });
        await new Promise((r) => setTimeout(r, 0));

        expect(caught).toBeTruthy();
        expect(repository.markAsSynced).not.toHaveBeenCalled();
        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('purges synced orphans before processing a sync batch', async () => {
        repository.purgeSyncedOrphans.mockResolvedValue(2);

        let result: any;
        service.syncBatch(10).then(r => result = r);
        await new Promise((r) => setTimeout(r, 0));

        expect(repository.purgeSyncedOrphans).toHaveBeenCalled();
        expect(result).toEqual({ success: 0, errors: 0, failedIds: [] });
    });
});

/**
 * Fake repository that simulates SQLite PK rewrite + INSERT OR REPLACE,
 * so we can assert there is no Local UUID orphan left after a successful sync.
 */
class InMemoryCollectionRepository {
    rows = new Map<string, TontineCollection>();
    mappings = new Map<string, string>();

    async getServerId(_localId: string, _entityType: string): Promise<string | null> {
        return '42';
    }

    async saveIdMapping(localId: string, serverId: string, _entityType: string): Promise<void> {
        this.mappings.set(localId, serverId);
    }

    async markAsSynced(localId: string, serverId: string): Promise<void> {
        if (localId === serverId) {
            return;
        }
        const existing = this.rows.get(localId);
        if (!existing) {
            return;
        }
        this.rows.delete(localId);
        this.rows.set(serverId, {
            ...existing,
            id: serverId,
            isLocal: false,
            isSync: true
        });
    }

    async saveAll(entities: TontineCollection[], _updateMemberTotal = false): Promise<void> {
        for (const entity of entities) {
            this.rows.set(entity.id, { ...entity });
        }
    }

    async purgeSyncedOrphans(): Promise<number> {
        let purged = 0;
        for (const [localId, serverId] of this.mappings.entries()) {
            if (this.rows.has(localId) && this.rows.has(serverId)) {
                const local = this.rows.get(localId)!;
                if (local.isLocal && !local.isSync) {
                    this.rows.delete(localId);
                    purged++;
                }
            }
        }
        return purged;
    }
}

describe('TontineCollectionSyncService — no local duplication after sync', () => {
    let service: TontineCollectionSyncService;
    let httpMock: HttpTestingController;
    let store: InMemoryCollectionRepository;

    beforeEach(() => {
        store = new InMemoryCollectionRepository();

        TestBed.configureTestingModule({
            imports: [],
            providers: [
                TontineCollectionSyncService,
                { provide: TontineCollectionRepository, useValue: store },
                {
                    provide: TontineCollectionRepositoryExtensions,
                    useValue: {
                        findByCommercialPaginated: vi.fn().mockImplementation(async () => {
                            const content = [...store.rows.values()].filter(c => c.isLocal && !c.isSync);
                            return { content, totalElements: content.length };
                        })
                    }
                },
                { provide: AuthService, useValue: { currentUser: { username: 'COM015', accessToken: 't' } } },
                { provide: SyncErrorService, useValue: { logSyncError: vi.fn() } }
            ]
        });

        service = TestBed.inject(TontineCollectionSyncService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('leaves a single Sync row (server id) and no Local UUID orphan after successful sync', async () => {
        const local: TontineCollection = {
            id: '88e39a61-aaaa-bbbb-cccc-ddddeeeeffff',
            tontineMemberId: '42',
            amount: 300,
            collectionDate: '2026-09-16T17:07:17.000Z',
            commercialUsername: 'COM015',
            isLocal: true,
            isSync: false
        };
        store.rows.set(local.id, { ...local });

        service.syncSingle(local).then(() => undefined);
        await new Promise((r) => setTimeout(r, 0));

        const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tontines/collections`);
        expect(req.request.body.reference).toBe(local.id);
        req.flush({
            data: {
                id: 31979,
                amount: 300,
                collectionDate: '2026-09-16T17:07:17',
                societyShareAmount: 0,
                contributionMonth: '2026-09-01',
                advanceToNextMonth: false
            }
        });
        await new Promise((r) => setTimeout(r, 0));

        expect(store.rows.size).toBe(1);
        expect(store.rows.has(local.id)).toBe(false);
        expect(store.rows.has('31979')).toBe(true);

        const remaining = store.rows.get('31979')!;
        expect(remaining.isSync).toBe(true);
        expect(remaining.isLocal).toBe(false);
        expect(remaining.amount).toBe(300);
        expect(remaining.societyShareAmount).toBe(0);
    });

    it('purges a pre-existing Local+Sync twin pair so the report would not double-count', async () => {
        const localId = 'c2a81187-local-orphan';
        store.rows.set(localId, {
            id: localId,
            tontineMemberId: '42',
            amount: 300,
            collectionDate: '2026-09-16T15:49:30.000Z',
            commercialUsername: 'COM011',
            isLocal: true,
            isSync: false
        });
        store.rows.set('32029', {
            id: '32029',
            tontineMemberId: '42',
            amount: 300,
            collectionDate: '2026-09-16T15:49:30.000Z',
            commercialUsername: 'COM011',
            isLocal: false,
            isSync: true
        });
        store.mappings.set(localId, '32029');

        expect(store.rows.size).toBe(2);

        let batchResult: any;
        service.syncBatch(10).then(r => batchResult = r);
        await new Promise((r) => setTimeout(r, 0));

        expect(store.rows.size).toBe(1);
        expect(store.rows.has(localId)).toBe(false);
        expect(store.rows.has('32029')).toBe(true);
        expect(batchResult).toEqual({ success: 0, errors: 0, failedIds: [] });
    });
});
