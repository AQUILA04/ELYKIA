import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmCarnetVerificationApiService } from './rm-carnet-verification-api.service';
import { RmCarnetVerificationQueueService } from './rm-carnet-verification-queue.service';

export interface RmCarnetVerificationSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class RmCarnetVerificationSyncService {
  constructor(
    private readonly queue: RmCarnetVerificationQueueService,
    private readonly api: RmCarnetVerificationApiService,
    private readonly coordinator: OnlineFirstWriteCoordinator
  ) {}

  async syncPending(): Promise<RmCarnetVerificationSyncResult> {
    const pending = await this.queue.listPending();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const op of pending) {
      try {
        await this.api.setVerified(op.tontineMemberId, op.verified);
        await this.queue.markSynced(op.localId);
        synced += 1;
      } catch (error) {
        failed += 1;
        const message = this.coordinator.extractErrorMessage(error);
        errors.push(`${op.clientName || op.tontineMemberId}: ${message}`);
        await this.queue.markError(op.localId, message);
      }
    }

    return { synced, failed, errors };
  }
}
