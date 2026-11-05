import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { SyncErrorService } from '../sync-error.service';
import { RmCreditCarnetVerificationApiService } from './rm-credit-carnet-verification-api.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';
import {
  RmOfflineOpsSyncResult,
  syncPendingOfflineOps
} from './rm-offline-ops-sync.util';
import { logRmSyncFailure, resolveRmSyncSuccess, RM_SYNC_ENTITY } from './rm-sync-failure';

export type RmCreditCarnetVerificationSyncResult = RmOfflineOpsSyncResult;

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationSyncService {
  constructor(
    private readonly queue: RmCreditCarnetVerificationQueueService,
    private readonly api: RmCreditCarnetVerificationApiService,
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly syncErrors: SyncErrorService
  ) {}

  async syncPending(): Promise<RmCreditCarnetVerificationSyncResult> {
    return syncPendingOfflineOps({
      listPending: () => this.queue.listPending(),
      push: op => this.api.setVerified(op.creditId, op.verified),
      markSynced: async op => {
        await resolveRmSyncSuccess(this.syncErrors, op);
        await this.queue.markSynced(op.localId);
      },
      markError: async (op, error, message) => {
        const syncErrorId = await logRmSyncFailure(
          this.syncErrors,
          RM_SYNC_ENTITY.creditCarnet,
          op,
          String(op.clientName || op.reference || op.creditId),
          error
        );
        await this.queue.markError(op.localId, message, syncErrorId);
      },
      label: op => String(op.clientName || op.reference || op.creditId),
      extractError: error => this.coordinator.extractErrorMessage(error)
    });
  }
}
