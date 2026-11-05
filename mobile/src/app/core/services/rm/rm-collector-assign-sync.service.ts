import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { SyncErrorService } from '../sync-error.service';
import { RmCollectorAssignApiService } from './rm-collector-assign-api.service';
import { RmCollectorAssignQueueService } from './rm-collector-assign-queue.service';
import { RmCollectorAssignWriteService } from './rm-collector-assign-write.service';
import { RmScopeService } from './rm-scope.service';
import { logRmSyncFailure, resolveRmSyncSuccess, RM_SYNC_ENTITY } from './rm-sync-failure';

export interface RmCollectorAssignSyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class RmCollectorAssignSyncService {
  constructor(
    private readonly queue: RmCollectorAssignQueueService,
    private readonly api: RmCollectorAssignApiService,
    private readonly write: RmCollectorAssignWriteService,
    private readonly scope: RmScopeService,
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly syncErrors: SyncErrorService
  ) {}

  async syncPending(): Promise<RmCollectorAssignSyncResult> {
    const pending = await this.queue.listPending();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const op of pending) {
      try {
        await this.api.bulkAssign({
          clientIds: op.clientIds,
          collector: op.collector,
          tontineCollector: op.tontineCollector,
          transferInProgressCredits: op.transferInProgressCredits
        });
        await this.queue.markSynced(op.localId);
        await resolveRmSyncSuccess(this.syncErrors, op);
        const pack = this.scope.getPack();
        if (pack) {
          await this.scope.setPack(this.write.applyPackMutationSync(pack, op));
        }
        synced += 1;
      } catch (error) {
        failed += 1;
        const message = this.coordinator.extractErrorMessage(error);
        errors.push(`Clients ${op.clientIds.join(',')}: ${message}`);
        const syncErrorId = await logRmSyncFailure(
          this.syncErrors,
          RM_SYNC_ENTITY.assign,
          op,
          `Clients ${op.clientIds.join(', ')}`,
          error
        );
        await this.queue.markError(op.localId, message, syncErrorId);
      }
    }

    return { synced, failed, errors };
  }
}
