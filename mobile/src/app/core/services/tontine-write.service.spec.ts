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
  let coordinator: jasmine.SpyObj<OnlineFirstWriteCoordinator>;
  let collectionSyncService: { postCreateCollection: jasmine.Spy };
  let collectionRepository: {
    save: jasmine.Spy;
    saveAll: jasmine.Spy;
    saveIdMapping: jasmine.Spy;
    getByMemberId: jasmine.Spy;
  };

  beforeEach(() => {
    coordinator = jasmine.createSpyObj('OnlineFirstWriteCoordinator', ['executeWrite']);
    coordinator.executeWrite.and.callFake(async (options) => ({
      data: await options.saveOffline(),
      mode: 'offline' as const
    }));
    collectionSyncService = {
      postCreateCollection: jasmine.createSpy('postCreateCollection')
    };
    collectionRepository = {
      save: jasmine.createSpy('save').and.resolveTo(),
      saveAll: jasmine.createSpy('saveAll').and.resolveTo(),
      saveIdMapping: jasmine.createSpy('saveIdMapping').and.resolveTo(),
      getByMemberId: jasmine.createSpy('getByMemberId').and.resolveTo([])
    };

    TestBed.configureTestingModule({
      providers: [
        TontineWriteService,
        { provide: TontineMemberRepository, useValue: {
          save: jasmine.createSpy('save'),
          saveAll: jasmine.createSpy('saveAll').and.resolveTo(),
          updateMember: jasmine.createSpy('updateMember'),
          saveIdMapping: jasmine.createSpy('saveIdMapping'),
          findById: jasmine.createSpy('findById').and.resolveTo(null),
          updateDerivedAllocation: jasmine.createSpy('updateDerivedAllocation').and.resolveTo()
        } },
        { provide: TontineCollectionRepository, useValue: collectionRepository },
        { provide: TontineDeliveryRepository, useValue: {
          saveAll: jasmine.createSpy('saveAll').and.resolveTo(),
          saveIdMapping: jasmine.createSpy('saveIdMapping').and.resolveTo(),
          updateDeliveryStatusFields: jasmine.createSpy('updateDeliveryStatusFields').and.resolveTo(),
          getItems: jasmine.createSpy('getItems').and.resolveTo([]),
          getServerId: jasmine.createSpy('getServerId').and.resolveTo(null)
        } },
        { provide: TontineStockRepository, useValue: { updateQuantities: jasmine.createSpy('updateQuantities').and.resolveTo() } },
        { provide: TontineMemberSyncService, useValue: {} },
        { provide: TontineCollectionSyncService, useValue: collectionSyncService },
        { provide: TontineDeliverySyncService, useValue: {
          postCreateDelivery: jasmine.createSpy('postCreateDelivery'),
          postMarkDelivered: jasmine.createSpy('postMarkDelivered')
        } },
        { provide: OnlineFirstWriteCoordinator, useValue: coordinator },
        { provide: TontineCalculationService, useValue: {
          calculateMemberStatus: jasmine.createSpy('calculateMemberStatus').and.resolveTo({
            totalCollected: 0, societyShare: 0, availableBudget: 0, validatedMonths: 0, currentMonthDays: 0, collections: []
          })
        } },
        { provide: TontineService, useValue: { refreshMemberAfterCollection: () => of(null) } },
        { provide: DatabaseService, useValue: { getTontineSession: jasmine.createSpy('getTontineSession').and.resolveTo(null) } }
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
    coordinator.executeWrite.and.callFake(async (options) => ({
      data: await options.saveOnline(),
      mode: 'online' as const
    }));
    collectionSyncService.postCreateCollection.and.resolveTo({
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
    expect(saved.isSync).toBeTrue();
    expect(collectionRepository.saveIdMapping).toHaveBeenCalledWith('uuid-1', '99', 'tontine-collection');
  });

  it('retries the same UUID reference after a POST timeout by keeping the local id as reference', async () => {
    coordinator.executeWrite.and.callFake(async (options) => ({
      data: await options.saveOnline(),
      mode: 'online' as const
    }));
    collectionSyncService.postCreateCollection.and.resolveTo({
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

    expect(collectionSyncService.postCreateCollection.calls.mostRecent().args[0].id).toBe('uuid-retry');
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
    expect(memberRepo.saveAll).toHaveBeenCalledWith([jasmine.objectContaining({ deliveryStatus: 'PENDING' })]);
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
    expect(memberRepo.saveAll).toHaveBeenCalledWith([jasmine.objectContaining({ deliveryStatus: 'DELIVERED' })]);
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
    expect(saved.needsDeliverSync).toBeTrue();
    expect(deliveryRepo.updateDeliveryStatusFields).toHaveBeenCalled();
    expect(stockRepo.updateQuantities).toHaveBeenCalledWith('s1', 1);
  });
});
