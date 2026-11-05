import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { SyncErrorService } from '../sync-error.service';
import { RmCarnetVerificationApiService } from './rm-carnet-verification-api.service';
import { RmCarnetVerificationQueueService } from './rm-carnet-verification-queue.service';
import {
  RmOfflineOpsSyncResult,
  syncPendingOfflineOps
} from './rm-offline-ops-sync.util';
import { logRmSyncFailure, resolveRmSyncSuccess, RM_SYNC_ENTITY } from './rm-sync-failure';

export type RmCarnetVerificationSyncResult = RmOfflineOpsSyncResult;

@Injectable({ providedIn: 'root' })
export class RmCarnetVerificationSyncService {
  constructor(
    private readonly queue: RmCarnetVerificationQueueService,
    private readonly api: RmCarnetVerificationApiService,
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly syncErrors: SyncErrorService
  ) {}

  async syncPending(): Promise<RmCarnetVerificationSyncResult> {
    return syncPendingOfflineOps({
      listPending: () => this.queue.listPending(),
      push: op => this.api.setVerified(op.tontineMemberId, op.verified),
      markSynced: async op => {
        await resolveRmSyncSuccess(this.syncErrors, op);
        await this.queue.markSynced(op.localId);
      },
      markError: async (op, error, message) => {
        const syncErrorId = await logRmSyncFailure(
          this.syncErrors,
          RM_SYNC_ENTITY.carnet,
          op,
          String(op.clientName || op.tontineMemberId),
          error
        );
        await this.queue.markError(op.localId, message, syncErrorId);
      },
      label: op => String(op.clientName || op.tontineMemberId),
      extractError: error => this.coordinator.extractErrorMessage(error)
    });
  }
}
