import { Injectable } from '@angular/core';
import { TontineMemberRepository } from '../repositories/tontine-member.repository';
import { TontineCollectionRepository } from '../repositories/tontine-collection.repository';
import { TontineDeliveryRepository } from '../repositories/tontine-delivery.repository';
import { TontineStockRepository } from '../repositories/tontine-stock.repository';
import { TontineMemberSyncService } from './sync/tontine-member-sync.service';
import { TontineCollectionSyncService } from './sync/tontine-collection-sync.service';
import { TontineDeliverySyncService } from './sync/tontine-delivery-sync.service';
import { OnlineFirstWriteCoordinator } from './online-first-write.coordinator';
import { TontineCollection, TontineDelivery, TontineDeliveryItem, TontineMember } from '../../models/tontine.model';

export interface CreateTontineDeliveryParams {
  delivery: TontineDelivery;
  items: TontineDeliveryItem[];
  stockUpdates: Array<{ stockId: string; quantity: number }>;
  member: TontineMember;
}

@Injectable({
  providedIn: 'root'
})
export class TontineWriteService {
  constructor(
    private readonly memberRepository: TontineMemberRepository,
    private readonly collectionRepository: TontineCollectionRepository,
    private readonly deliveryRepository: TontineDeliveryRepository,
    private readonly stockRepository: TontineStockRepository,
    private readonly memberSyncService: TontineMemberSyncService,
    private readonly collectionSyncService: TontineCollectionSyncService,
    private readonly deliverySyncService: TontineDeliverySyncService,
    private readonly onlineFirstWriteCoordinator: OnlineFirstWriteCoordinator
  ) {}

  async registerMember(member: TontineMember, forceOffline = false): Promise<TontineMember> {
    const writeResult = await this.onlineFirstWriteCoordinator.executeWrite({
      entityLabel: 'tontine-member',
      forceOffline,
      saveOffline: () => this.persistMember(member, false, false),
      saveOnline: () => this.persistMember(member, true, false)
    });
    return writeResult.data;
  }

  async updateMember(member: TontineMember, forceOffline = false): Promise<TontineMember> {
    const writeResult = await this.onlineFirstWriteCoordinator.executeWrite({
      entityLabel: 'tontine-member',
      forceOffline,
      saveOffline: () => this.persistMember(member, false, true),
      saveOnline: () => this.persistMember(member, true, true)
    });
    return writeResult.data;
  }

  async recordCollection(collection: TontineCollection, forceOffline = false): Promise<TontineCollection> {
    const writeResult = await this.onlineFirstWriteCoordinator.executeWrite({
      entityLabel: 'tontine-collection',
      forceOffline,
      saveOffline: () => this.persistCollection(collection, false),
      saveOnline: () => this.persistCollection(collection, true)
    });
    return writeResult.data;
  }

  async createDelivery(params: CreateTontineDeliveryParams, forceOffline = false): Promise<TontineDelivery> {
    const writeResult = await this.onlineFirstWriteCoordinator.executeWrite({
      entityLabel: 'tontine-delivery',
      forceOffline,
      saveOffline: () => this.persistDelivery(params, false),
      saveOnline: () => this.persistDelivery(params, true)
    });
    return writeResult.data;
  }

  private async persistMember(
    member: TontineMember,
    online: boolean,
    isUpdate: boolean
  ): Promise<TontineMember> {
    let persisted: TontineMember = { ...member };

    if (online) {
      if (isUpdate) {
        await this.memberSyncService.postUpdateMember(persisted);
        persisted = {
          ...persisted,
          isLocal: false,
          isSync: true,
          syncDate: new Date().toISOString()
        };
        await this.memberRepository.saveAll([persisted]);
        return persisted;
      }

      const response = await this.memberSyncService.postCreateMember(persisted);
      const serverId = response.id.toString();
      await this.memberRepository.saveIdMapping(persisted.id, serverId, 'tontine-member');
      persisted = {
        ...persisted,
        id: serverId,
        isLocal: false,
        isSync: true,
        syncDate: new Date().toISOString()
      };
      await this.memberRepository.saveAll([persisted]);
      return persisted;
    }

    if (isUpdate) {
      await this.memberRepository.updateMember(persisted);
      return persisted;
    }

    await this.memberRepository.save(persisted);
    return persisted;
  }

  private async persistCollection(collection: TontineCollection, online: boolean): Promise<TontineCollection> {
    let persisted: TontineCollection = { ...collection };

    if (online) {
      const response = await this.collectionSyncService.postCreateCollection(persisted);
      const serverId = response.id.toString();
      const localId = persisted.id;
      await this.collectionRepository.saveIdMapping(localId, serverId, 'tontine-collection');
      persisted = {
        ...persisted,
        id: serverId,
        isLocal: false,
        isSync: true,
        syncDate: new Date().toISOString()
      };
    }

    await this.collectionRepository.save(persisted);
    return persisted;
  }

  private async persistDelivery(
    params: CreateTontineDeliveryParams,
    online: boolean
  ): Promise<TontineDelivery> {
    const { delivery, items, stockUpdates, member } = params;
    let persistedDelivery: TontineDelivery = { ...delivery, items: [...items] };

    if (online) {
      const response = await this.deliverySyncService.postCreateDelivery(persistedDelivery, items);
      const serverId = response.id.toString();
      const localId = persistedDelivery.id;
      await this.deliveryRepository.saveIdMapping(localId, serverId, 'tontine-delivery');
      persistedDelivery = {
        ...persistedDelivery,
        id: serverId,
        isLocal: false,
        isSync: true,
        syncDate: new Date().toISOString(),
        items: items.map((item) => ({
          ...item,
          tontineDeliveryId: serverId,
          id: `tdi-${serverId}-${item.articleId}`
        }))
      };
    }

    await this.deliveryRepository.saveAll([persistedDelivery]);

    for (const update of stockUpdates) {
      await this.stockRepository.updateQuantities(update.stockId, update.quantity);
    }

    const updatedMember: TontineMember = {
      ...member,
      deliveryStatus: 'DELIVERED'
    };
    await this.memberRepository.saveAll([updatedMember]);

    return persistedDelivery;
  }
}
