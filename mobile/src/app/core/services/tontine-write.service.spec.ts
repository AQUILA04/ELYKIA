import type { Mock, MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { TontineWriteService } from './tontine-write.service';
import { TontineMemberRepository } from '../repositories/tontine-member.repository';
import { TontineCollectionRepository } from '../repositories/tontine-collection.repository';
import { TontineDeliveryRepository } from '../repositories/tontine-delivery.repository';
import { TontineStockRepository } from '../repositories/tontine-stock.repository';
import { TontineMemberSyncService } from './sync/tontine-member-sync.service';
import { TontineCollectionSyncService } from './sync/tontine-collection-sync.service';
import { TontineDeliverySyncService } from './sync/tontine-delivery-sync.service';
import { OnlineFirstWriteCoordinator } from './online-first-write.coordinator';
import { TontineCalculationService } from './tontine-calculation.service';
import { TontineService } from './tontine.service';
import { DatabaseService } from './database.service';
import { of } from 'rxjs';

describe('TontineWriteService', () => {
    let service: TontineWriteService;
    let coordinator: MockedObject<OnlineFirstWriteCoordinator>;
    let collectionSyncService: {
        postCreateCollection: Mock;
    };
    let collectionRepository: {
        save: Mock;
        saveAll: Mock;
        saveIdMapping: Mock;
        getByMemberId: Mock;
    };

    beforeEach(() => {
        coordinator = {
            executeWrite: vi.fn().mockName("OnlineFirstWriteCoordinator.executeWrite")
        } as unknown as MockedObject<OnlineFirstWriteCoordinator>;
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOffline(),
            mode: 'offline' as const
        }));
        collectionSyncService = {
            postCreateCollection: vi.fn()
        };
        collectionRepository = {
            save: vi.fn().mockResolvedValue(undefined),
            saveAll: vi.fn().mockResolvedValue(undefined),
            saveIdMapping: vi.fn().mockResolvedValue(undefined),
            getByMemberId: vi.fn().mockResolvedValue([])
        };

        TestBed.configureTestingModule({
            providers: [
                TontineWriteService,
                { provide: TontineMemberRepository, useValue: {
                        save: vi.fn(),
                        saveAll: vi.fn().mockResolvedValue(undefined),
                        updateMember: vi.fn(),
                        saveIdMapping: vi.fn(),
                        findById: vi.fn().mockResolvedValue(null),
                        updateDerivedAllocation: vi.fn().mockResolvedValue(undefined)
                    } },
                { provide: TontineCollectionRepository, useValue: collectionRepository },
                { provide: TontineDeliveryRepository, useValue: {
                        saveAll: vi.fn().mockResolvedValue(undefined),
                        saveIdMapping: vi.fn().mockResolvedValue(undefined),
                        updateDeliveryStatusFields: vi.fn().mockResolvedValue(undefined),
                        getItems: vi.fn().mockResolvedValue([]),
                        getServerId: vi.fn().mockResolvedValue(null),
                        deleteLocalTwin: vi.fn().mockResolvedValue(undefined)
                    } },
                { provide: TontineStockRepository, useValue: { updateQuantities: vi.fn().mockResolvedValue(undefined) } },
                { provide: TontineMemberSyncService, useValue: {} },
                { provide: TontineCollectionSyncService, useValue: collectionSyncService },
                { provide: TontineDeliverySyncService, useValue: {
                        postCreateDelivery: vi.fn(),
                        postMarkDelivered: vi.fn(),
                        applyMergedOrder: vi.fn()
                    } },
                { provide: OnlineFirstWriteCoordinator, useValue: coordinator },
                { provide: TontineCalculationService, useValue: {
                        calculateMemberStatus: vi.fn().mockResolvedValue({
                            totalCollected: 0, societyShare: 0, availableBudget: 0, validatedMonths: 0, currentMonthDays: 0, collections: []
                        })
                    } },
                { provide: TontineService, useValue: { refreshMemberAfterCollection: () => of(null) } },
                { provide: DatabaseService, useValue: { getTontineSession: vi.fn().mockResolvedValue(null) } }
            ]
        });

        service = TestBed.inject(TontineWriteService);
    });

    it('delegates member registration to online-first coordinator', async () => {
        const member = { id: 'local-1', clientId: 'c1' } as any;

        await service.registerMember(member);

        expect(coordinator.executeWrite).toHaveBeenCalled();
    });

    it('persists server allocation fields after a successful online-first POST', async () => {
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOnline(),
            mode: 'online' as const
        }));
        collectionSyncService.postCreateCollection.mockResolvedValue({
            id: 99,
            amount: 5000,
            collectionDate: '2026-03-15',
            societyShareAmount: 1000,
            contributionMonth: '2026-03-01',
            advanceToNextMonth: false
        });

        const saved = await service.recordCollection({
            id: 'uuid-1',
            tontineMemberId: '42',
            amount: 5000,
            collectionDate: '2026-03-15T08:00:00.000Z',
            isLocal: true,
            isSync: false,
            advanceToNextMonth: false
        } as any);

        expect(saved.id).toBe('99');
        expect(saved.societyShareAmount).toBe(1000);
        expect(saved.contributionMonth).toBe('2026-03-01');
        expect(saved.isSync).toBe(true);
        expect(collectionRepository.saveIdMapping).toHaveBeenCalledWith('uuid-1', '99', 'tontine-collection');
    });

    it('retries the same UUID reference after a POST timeout by keeping the local id as reference', async () => {
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOnline(),
            mode: 'online' as const
        }));
        collectionSyncService.postCreateCollection.mockResolvedValue({
            id: 77,
            amount: 3000,
            collectionDate: '2026-03-15',
            societyShareAmount: 1000,
            contributionMonth: '2026-03-01'
        });

        await service.recordCollection({
            id: 'uuid-retry',
            tontineMemberId: '42',
            amount: 3000,
            collectionDate: '2026-03-15',
            isLocal: true,
            isSync: false
        } as any);

        expect(vi.mocked(collectionSyncService.postCreateCollection).mock.lastCall![0].id).toBe('uuid-retry');
    });

    it('creates an order without deducting stock and sets member PENDING', async () => {
        const deliveryRepo = TestBed.inject(TontineDeliveryRepository) as any;
        const stockRepo = TestBed.inject(TontineStockRepository) as any;
        const memberRepo = TestBed.inject(TontineMemberRepository) as any;

        const saved = await service.createDelivery({
            delivery: {
                id: 'd1',
                tontineMemberId: 'm1',
                commercialUsername: 'c1',
                requestDate: '2026-09-17T10:00:00.000Z',
                status: 'PENDING',
                totalAmount: 1000,
                isLocal: true,
                isSync: false
            } as any,
            items: [],
            stockUpdates: [{ stockId: 's1', quantity: 2 }],
            member: { id: 'm1', deliveryStatus: 'PENDING' } as any
        });

        expect(saved.status).toBe('PENDING');
        expect(stockRepo.updateQuantities).not.toHaveBeenCalled();
        expect(memberRepo.saveAll).toHaveBeenCalledWith([expect.objectContaining({ deliveryStatus: 'PENDING' })]);
    });

    it('creates a direct delivery and deducts stock', async () => {
        const stockRepo = TestBed.inject(TontineStockRepository) as any;
        const memberRepo = TestBed.inject(TontineMemberRepository) as any;

        await service.createDelivery({
            delivery: {
                id: 'd2',
                tontineMemberId: 'm1',
                commercialUsername: 'c1',
                requestDate: '2026-09-17T10:00:00.000Z',
                deliveryDate: '2026-09-17T10:00:00.000Z',
                status: 'DELIVERED',
                totalAmount: 1000,
                isLocal: true,
                isSync: false
            } as any,
            items: [],
            stockUpdates: [{ stockId: 's1', quantity: 2 }],
            member: { id: 'm1', deliveryStatus: 'PENDING' } as any
        });

        expect(stockRepo.updateQuantities).toHaveBeenCalledWith('s1', 2);
        expect(memberRepo.saveAll).toHaveBeenCalledWith([expect.objectContaining({ deliveryStatus: 'DELIVERED' })]);
    });

    it('keeps the server order when an online order was merged into one saved on another phone', async () => {
        const deliveryRepo = TestBed.inject(TontineDeliveryRepository) as any;
        const memberRepo = TestBed.inject(TontineMemberRepository) as any;
        const syncService = TestBed.inject(TontineDeliverySyncService) as any;
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOnline(),
            mode: 'online' as const
        }));
        syncService.postCreateDelivery.mockResolvedValue({ id: 7001, reference: 'LIV-A', totalAmount: 35000, mergedIntoExisting: true });
        syncService.applyMergedOrder.mockImplementation(async (local: any) => ({
            ...local, id: '7001', reference: 'LIV-A', totalAmount: 35000, status: 'PENDING', mergedIntoExisting: true
        }));

        const saved = await service.createDelivery({
            delivery: {
                id: 'local-b', tontineMemberId: 'm1', commercialUsername: 'COM005',
                requestDate: '2026-11-20T10:00:00.000Z', status: 'PENDING', totalAmount: 5000, isLocal: true, isSync: false
            } as any,
            items: [],
            stockUpdates: [],
            member: { id: 'm1', deliveryStatus: 'VALIDATED' } as any
        });

        expect(saved.mergedIntoExisting).toBe(true);
        expect(saved.id).toBe('7001');
        expect(saved.totalAmount).toBe(35000);
        expect(deliveryRepo.saveAll).not.toHaveBeenCalled();
        expect(memberRepo.saveAll).toHaveBeenCalledWith([expect.objectContaining({ deliveryStatus: 'PENDING' })]);
    });

    it('removes the local PENDING row when an unsynced order is delivered online', async () => {
        const deliveryRepo = TestBed.inject(TontineDeliveryRepository) as any;
        const syncService = TestBed.inject(TontineDeliverySyncService) as any;
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOnline(),
            mode: 'online' as const
        }));
        syncService.postCreateDelivery.mockResolvedValue({ id: 42, reference: 'TL-1' });

        const saved = await service.markDeliveryAsDelivered({
            delivery: {
                id: 'local-uuid',
                tontineMemberId: 'm1',
                status: 'PENDING',
                isLocal: true,
                isSync: false,
                items: [{ id: 'i1', articleId: 'a1', quantity: 1 }]
            } as any,
            member: { id: 'm1', deliveryStatus: 'PENDING' } as any,
            stockUpdates: []
        });

        expect(saved.id).toBe('42');
        expect(deliveryRepo.saveAll).toHaveBeenCalledWith([expect.objectContaining({ id: '42', status: 'DELIVERED' })]);
        expect(deliveryRepo.deleteLocalTwin).toHaveBeenCalledWith('local-uuid');
    });

    it('keeps the row when a synced order is delivered online under the same id', async () => {
        const deliveryRepo = TestBed.inject(TontineDeliveryRepository) as any;
        const syncService = TestBed.inject(TontineDeliverySyncService) as any;
        coordinator.executeWrite.mockImplementation(async (options) => ({
            data: await options.saveOnline(),
            mode: 'online' as const
        }));
        syncService.postMarkDelivered.mockResolvedValue({ id: 55 });

        await service.markDeliveryAsDelivered({
            delivery: { id: '55', tontineMemberId: 'm1', status: 'PENDING', isSync: true, isLocal: false, items: [] } as any,
            member: { id: 'm1' } as any,
            stockUpdates: []
        });

        expect(deliveryRepo.deleteLocalTwin).not.toHaveBeenCalled();
    });

    it('marks a synced order as delivered offline with needsDeliverSync', async () => {
        const deliveryRepo = TestBed.inject(TontineDeliveryRepository) as any;
        const stockRepo = TestBed.inject(TontineStockRepository) as any;

        const saved = await service.markDeliveryAsDelivered({
            delivery: {
                id: '55',
                tontineMemberId: 'm1',
                status: 'PENDING',
                isSync: true,
                isLocal: false,
                items: []
            } as any,
            member: { id: 'm1' } as any,
            stockUpdates: [{ stockId: 's1', quantity: 1 }]
        });

        expect(saved.status).toBe('DELIVERED');
        expect(saved.needsDeliverSync).toBe(true);
        expect(deliveryRepo.updateDeliveryStatusFields).toHaveBeenCalled();
        expect(stockRepo.updateQuantities).toHaveBeenCalledWith('s1', 1);
    });
});
