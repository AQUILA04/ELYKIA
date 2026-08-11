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

describe('TontineWriteService', () => {
  let service: TontineWriteService;
  let coordinator: jasmine.SpyObj<OnlineFirstWriteCoordinator>;

  beforeEach(() => {
    coordinator = jasmine.createSpyObj('OnlineFirstWriteCoordinator', ['executeWrite']);
    coordinator.executeWrite.and.callFake(async (options) => ({
      data: await options.saveOffline(),
      mode: 'offline' as const
    }));

    TestBed.configureTestingModule({
      providers: [
        TontineWriteService,
        { provide: TontineMemberRepository, useValue: { save: jasmine.createSpy('save'), saveAll: jasmine.createSpy('saveAll'), updateMember: jasmine.createSpy('updateMember'), saveIdMapping: jasmine.createSpy('saveIdMapping') } },
        { provide: TontineCollectionRepository, useValue: { save: jasmine.createSpy('save'), saveIdMapping: jasmine.createSpy('saveIdMapping') } },
        { provide: TontineDeliveryRepository, useValue: { saveAll: jasmine.createSpy('saveAll'), saveIdMapping: jasmine.createSpy('saveIdMapping') } },
        { provide: TontineStockRepository, useValue: { updateQuantities: jasmine.createSpy('updateQuantities') } },
        { provide: TontineMemberSyncService, useValue: {} },
        { provide: TontineCollectionSyncService, useValue: {} },
        { provide: TontineDeliverySyncService, useValue: {} },
        { provide: OnlineFirstWriteCoordinator, useValue: coordinator }
      ]
    });

    service = TestBed.inject(TontineWriteService);
  });

  it('delegates member registration to online-first coordinator', async () => {
    const member = { id: 'local-1', clientId: 'c1' } as any;

    await service.registerMember(member);

    expect(coordinator.executeWrite).toHaveBeenCalled();
  });
});
