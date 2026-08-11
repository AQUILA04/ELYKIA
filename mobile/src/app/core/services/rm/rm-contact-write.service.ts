import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { AuthService } from '../auth.service';
import { RmContactApiService } from './rm-contact-api.service';
import { RmContactQueueService } from './rm-contact-queue.service';
import { RmScopeService } from './rm-scope.service';
import { RmContactPatch, RmContactUpdateRequest, RmContactUpdateResult } from './rm-contact.models';
import { RmOfflinePack, RmPackClient } from './rm.models';

@Injectable({ providedIn: 'root' })
export class RmContactWriteService {
  constructor(
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly api: RmContactApiService,
    private readonly queue: RmContactQueueService,
    private readonly scope: RmScopeService,
    private readonly auth: AuthService
  ) {}

  async updateContact(request: RmContactUpdateRequest): Promise<RmContactUpdateResult> {
    const patch = this.buildPatch(request);
    const localClient = this.mergeLocalClient(request);

    const result = await this.coordinator.executeWrite({
      entityLabel: `RmContact:${request.clientId}`,
      forceOffline: request.forceOffline === true,
      saveOnline: async () => {
        const updated = await this.api.updateContact(request.clientId, {
          phone: request.phone,
          latitude: request.latitude,
          longitude: request.longitude,
          mll: request.mll || this.buildMll(request.latitude, request.longitude),
          reference: patch.reference
        });
        const synced: RmContactPatch = { ...patch, isSync: true, lastError: null };
        await this.queue.upsert(synced);
        await this.applyPackMutation(updated);
        return { patch: synced, client: updated };
      },
      saveOffline: async () => {
        const pending: RmContactPatch = { ...patch, isSync: false };
        await this.queue.upsert(pending);
        await this.applyPackMutation(localClient);
        return { patch: pending, client: localClient };
      }
    });

    return {
      patch: result.data.patch,
      mode: result.mode,
      client: result.data.client
    };
  }

  private buildPatch(request: RmContactUpdateRequest): RmContactPatch {
    const username = this.auth.currentUser?.username || 'rm';
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return {
      localId: `contact-${Date.now()}-${rand}`,
      reference: `RCC-${datePart}-${username}-${request.clientId}-${rand}`.slice(0, 64),
      clientId: request.clientId,
      phone: request.phone,
      latitude: request.latitude,
      longitude: request.longitude,
      mll: request.mll || this.buildMll(request.latitude, request.longitude),
      createdAt: new Date().toISOString(),
      isSync: false,
      lastError: null
    };
  }

  private mergeLocalClient(request: RmContactUpdateRequest): RmPackClient {
    const existing = this.scope.getPack()?.clients?.find(c => c.id === request.clientId);
    return {
      ...(existing || { id: request.clientId }),
      id: request.clientId,
      phone: request.phone ?? existing?.phone,
      latitude: request.latitude ?? existing?.latitude,
      longitude: request.longitude ?? existing?.longitude,
      mll: request.mll || this.buildMll(request.latitude ?? existing?.latitude, request.longitude ?? existing?.longitude) || existing?.mll
    };
  }

  private buildMll(lat?: number, lng?: number): string | undefined {
    if (lat == null || lng == null) {
      return undefined;
    }
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  private async applyPackMutation(client: RmPackClient): Promise<void> {
    const pack = this.scope.getPack();
    if (!pack) {
      return;
    }

    const clients = [...(pack.clients || [])];
    const idx = clients.findIndex(c => c.id === client.id);
    if (idx >= 0) {
      clients[idx] = { ...clients[idx], ...client };
    } else {
      clients.push(client);
    }

    const lateCredits = (pack.lateCredits || []).map(late => {
      if (late.clientId !== client.id) {
        return late;
      }
      return {
        ...late,
        clientPhone: client.phone ?? late.clientPhone
      };
    });

    const nextPack: RmOfflinePack = { ...pack, clients, lateCredits };
    await this.scope.setPack(nextPack);
  }
}
