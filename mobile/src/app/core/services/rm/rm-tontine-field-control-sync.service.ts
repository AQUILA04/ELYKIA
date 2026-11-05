import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { SyncErrorService } from '../sync-error.service';
import { RmTontineFieldControlApiService } from './rm-tontine-field-control-api.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';
import { mutatePackCarnetFlag } from './rm-pack-carnet-mutation.util';
import { RmScopeService } from './rm-scope.service';
import { RmTontineFieldControlOp } from './rm-tontine-field-control.models';
import { logRmSyncFailure, resolveRmSyncSuccess, RM_SYNC_ENTITY } from './rm-sync-failure';

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
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly scope: RmScopeService,
    private readonly syncErrors: SyncErrorService
  ) {}

  async syncPending(): Promise<RmTontineFieldControlSyncResult> {
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
        errors.push(`${op.clientName || op.tontineMemberId}: ${message}`);
        const syncErrorId = await logRmSyncFailure(
          this.syncErrors,
          RM_SYNC_ENTITY.tontineFieldControl,
          op,
          String(op.clientName || op.tontineMemberId),
          error
        );
        await this.queue.markError(op.reference, message, syncErrorId);
      }
    }

    return { synced, failed, errors };
  }

  private async syncOne(op: RmTontineFieldControlOp): Promise<void> {
    const dto = await this.api.create(op.tontineMemberId, {
      reference: op.reference,
      months: op.months.map(m => ({
        year: m.year,
        month: m.month,
        commercialUsername: m.commercialUsername,
        notebookAmount: m.notebookAmount
      })),
      note: op.note,
      observedAt: op.observedAt
    });
    if (typeof dto?.carnetVerified === 'boolean') {
      await mutatePackCarnetFlag(
        this.scope,
        'tontineMembers',
        op.tontineMemberId,
        dto.carnetVerified,
        dto.carnetVerifiedAt,
        dto.carnetVerifiedBy
      );
    }
    await this.queue.markSynced(op.reference);
  }
}
