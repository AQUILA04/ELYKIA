import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmTontineFieldControlApiService } from './rm-tontine-field-control-api.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';
import { RmTontineFieldControlOp } from './rm-tontine-field-control.models';

export interface RmTontineFieldControlSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class RmTontineFieldControlSyncService {
  constructor(
    private readonly queue: RmTontineFieldControlQueueService,
    private readonly api: RmTontineFieldControlApiService,
    private readonly coordinator: OnlineFirstWriteCoordinator
  ) {}

  async syncPending(): Promise<RmTontineFieldControlSyncResult> {
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
        errors.push(`${op.clientName || op.tontineMemberId}: ${message}`);
        await this.queue.markError(op.reference, message);
      }
    }

    return { synced, failed, errors };
  }

  private async syncOne(op: RmTontineFieldControlOp): Promise<void> {
    await this.api.create(op.tontineMemberId, {
      reference: op.reference,
      months: op.months.map(m => ({
        year: m.year,
        month: m.month,
        notebookAmount: m.notebookAmount
      })),
      note: op.note,
      observedAt: op.observedAt
    });
    await this.queue.markSynced(op.reference);
  }
}
