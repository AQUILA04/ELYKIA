import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmCreditCarnetVerificationApiService } from './rm-credit-carnet-verification-api.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';

export interface RmCreditCarnetVerificationSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationSyncService {
  constructor(
    private readonly queue: RmCreditCarnetVerificationQueueService,
    private readonly api: RmCreditCarnetVerificationApiService,
    private readonly coordinator: OnlineFirstWriteCoordinator
  ) {}

  async syncPending(): Promise<RmCreditCarnetVerificationSyncResult> {
    const pending = await this.queue.listPending();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const op of pending) {
      try {
        await this.api.setVerified(op.creditId, op.verified);
        await this.queue.markSynced(op.localId);
        synced += 1;
      } catch (error) {
        failed += 1;
        const message = this.coordinator.extractErrorMessage(error);
        errors.push(`${op.clientName || op.reference || op.creditId}: ${message}`);
        await this.queue.markError(op.localId, message);
      }
    }

    return { synced, failed, errors };
  }
}
