import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { SyncErrorService } from '../sync-error.service';
import { RmSocietyShareApiService } from './rm-society-share-api.service';
import { RmSocietyShareQueueService } from './rm-society-share-queue.service';
import { RmOfflineOpsSyncResult, syncPendingOfflineOps } from './rm-offline-ops-sync.util';
import { logRmSyncFailure, resolveRmSyncSuccess, RM_SYNC_ENTITY } from './rm-sync-failure';
import { mutatePackSocietyShare } from './rm-pack-society-share-mutation.util';
import { RmScopeService } from './rm-scope.service';

@Injectable({ providedIn: 'root' })
export class RmSocietyShareSyncService {
  constructor(
    private readonly queue: RmSocietyShareQueueService,
    private readonly api: RmSocietyShareApiService,
    private readonly coordinator: OnlineFirstWriteCoordinator,
    private readonly syncErrors: SyncErrorService,
    private readonly scope: RmScopeService
  ) {}

  async syncPending(): Promise<RmOfflineOpsSyncResult> {
    return syncPendingOfflineOps({
      listPending: () => this.queue.listPending(),
      push: async op => {
        const result = await this.api.submit(op.tontineMemberId, op.declaredSocietyShare, op.reference, op.comment);
        await mutatePackSocietyShare(this.scope, op.tontineMemberId, result);
        return result;
      },
      markSynced: async op => {
        await resolveRmSyncSuccess(this.syncErrors, op);
        await this.queue.markSynced(op.localId);
      },
      markError: async (op, error, message) => {
        const syncErrorId = await logRmSyncFailure(
          this.syncErrors,
          RM_SYNC_ENTITY.societyShare,
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
