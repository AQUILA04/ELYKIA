import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmCarnetVerificationApiService } from './rm-carnet-verification-api.service';
import { RmCarnetVerificationQueueService } from './rm-carnet-verification-queue.service';
import {
  RmOfflineOpsSyncResult,
  syncPendingOfflineOps
} from './rm-offline-ops-sync.util';

export type RmCarnetVerificationSyncResult = RmOfflineOpsSyncResult;

@Injectable({ providedIn: 'root' })
export class RmCarnetVerificationSyncService {
  constructor(
    private readonly queue: RmCarnetVerificationQueueService,
    private readonly api: RmCarnetVerificationApiService,
    private readonly coordinator: OnlineFirstWriteCoordinator
  ) {}

  async syncPending(): Promise<RmCarnetVerificationSyncResult> {
    return syncPendingOfflineOps({
      listPending: () => this.queue.listPending(),
      push: op => this.api.setVerified(op.tontineMemberId, op.verified),
      markSynced: localId => this.queue.markSynced(localId),
      markError: (localId, error) => this.queue.markError(localId, error),
      label: op => String(op.clientName || op.tontineMemberId),
      extractError: error => this.coordinator.extractErrorMessage(error)
    });
  }
}
