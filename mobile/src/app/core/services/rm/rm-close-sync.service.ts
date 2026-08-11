import { Injectable } from '@angular/core';
import { OnlineWriteError, WriteErrorKind } from '../online-first-write.types';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmCloseApiService } from './rm-close-api.service';
import { RmCloseQueueService } from './rm-close-queue.service';
import { RmCloseOp } from './rm-close.models';

export interface RmCloseSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class RmCloseSyncService {
  constructor(
    private readonly queue: RmCloseQueueService,
    private readonly api: RmCloseApiService,
    private readonly coordinator: OnlineFirstWriteCoordinator
  ) {}

  async syncPending(): Promise<RmCloseSyncResult> {
    const pending = await this.queue.listPending();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const op of pending) {
      try {
        await this.syncOne(op);
        synced += 1;
      } catch (error) {
        failed += 1;
        const message = this.coordinator.extractErrorMessage(error);
        errors.push(`${op.creditReference || op.creditId}: ${message}`);
        await this.queue.markError(op.reference, message);
        if (error instanceof OnlineWriteError && error.kind === WriteErrorKind.BUSINESS) {
          // Keep in queue with error — user can dismiss later; still counts as failed
        }
      }
    }

    return { synced, failed, errors };
  }

  private async syncOne(op: RmCloseOp): Promise<void> {
    const response = await this.api.closeCredits([{
      creditId: op.creditId,
      amount: op.amount,
      isPartial: op.isPartial,
      reference: op.reference
    }]);

    const failure = response.failures?.find(f => f.creditId === op.creditId);
    if (failure) {
      throw new OnlineWriteError(
        WriteErrorKind.BUSINESS,
        failure.errorMessage || 'Clôture refusée'
      );
    }

    await this.queue.markSynced(op.reference);
  }
}
