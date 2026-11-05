import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { SyncErrorService } from '../sync-error.service';
import { RmFieldControlApiService } from './rm-field-control-api.service';
import { RmFieldControlQueueService } from './rm-field-control-queue.service';
import { RmFieldControlOp } from './rm-field-control.models';
import { logRmSyncFailure, resolveRmSyncSuccess, RM_SYNC_ENTITY } from './rm-sync-failure';

export interface RmFieldControlSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class RmFieldControlSyncService {
  constructor(
    private readonly queue: RmFieldControlQueueService,
    private readonly api: RmFieldControlApiService,
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly syncErrors: SyncErrorService
  ) {}

  async syncPending(): Promise<RmFieldControlSyncResult> {
    const pending = await this.queue.listPending();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const op of pending) {
      try {
        await this.syncOne(op);
        await resolveRmSyncSuccess(this.syncErrors, op);
        synced += 1;
      } catch (error) {
        failed += 1;
        const message = this.coordinator.extractErrorMessage(error);
        errors.push(`${op.creditReference || op.creditId}: ${message}`);
        const syncErrorId = await logRmSyncFailure(
          this.syncErrors,
          RM_SYNC_ENTITY.fieldControl,
          op,
          String(op.creditReference || op.creditId),
          error
        );
        await this.queue.markError(op.reference, message, syncErrorId);
      }
    }

    return { synced, failed, errors };
  }

  private async syncOne(op: RmFieldControlOp): Promise<void> {
    await this.api.create(op.creditId, {
      reference: op.reference,
      notebookTotalAmount: op.notebookTotalAmount,
      note: op.note,
      observedAt: op.observedAt
    });
    await this.queue.markSynced(op.reference);
  }
}
