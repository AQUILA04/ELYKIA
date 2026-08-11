import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmContactApiService } from './rm-contact-api.service';
import { RmContactQueueService } from './rm-contact-queue.service';
import { RmContactPatch } from './rm-contact.models';
import { RmScopeService } from './rm-scope.service';

export interface RmContactSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class RmContactSyncService {
  constructor(
    private readonly queue: RmContactQueueService,
    private readonly api: RmContactApiService,
    private readonly scope: RmScopeService,
    private readonly coordinator: OnlineFirstWriteCoordinator
  ) {}

  async syncPending(): Promise<RmContactSyncResult> {
    const pending = await this.queue.listPending();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const patch of pending) {
      try {
        await this.syncOne(patch);
        synced += 1;
      } catch (error) {
        failed += 1;
        const message = this.coordinator.extractErrorMessage(error);
        errors.push(`Client ${patch.clientId}: ${message}`);
        await this.queue.markError(patch.reference, message);
      }
    }

    return { synced, failed, errors };
  }

  private async syncOne(patch: RmContactPatch): Promise<void> {
    const updated = await this.api.updateContact(patch.clientId, {
      phone: patch.phone,
      latitude: patch.latitude,
      longitude: patch.longitude,
      mll: patch.mll,
      reference: patch.reference
    });
    await this.queue.markSynced(patch.reference);

    const pack = this.scope.getPack();
    if (pack) {
      const clients = [...(pack.clients || [])];
      const idx = clients.findIndex(c => c.id === updated.id);
      if (idx >= 0) {
        clients[idx] = { ...clients[idx], ...updated };
        await this.scope.setPack({ ...pack, clients });
      }
    }
  }
}
