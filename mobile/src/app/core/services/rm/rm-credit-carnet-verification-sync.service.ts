import { Injectable } from '@angular/core';
import { OnlineFirstWriteCoordinator } from '../online-first-write.coordinator';
import { RmCreditCarnetVerificationApiService } from './rm-credit-carnet-verification-api.service';
import { RmCreditCarnetVerificationQueueService } from './rm-credit-carnet-verification-queue.service';
import {
  RmOfflineOpsSyncResult,
  syncPendingOfflineOps
} from './rm-offline-ops-sync.util';

export type RmCreditCarnetVerificationSyncResult = RmOfflineOpsSyncResult;

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationSyncService {
  constructor(
    private readonly queue: RmCreditCarnetVerificationQueueService,
    private readonly api: RmCreditCarnetVerificationApiService,
    private readonly coordinator: OnlineFirstWriteCoordinator
  ) {}

  async syncPending(): Promise<RmCreditCarnetVerificationSyncResult> {
    return syncPendingOfflineOps({
      listPending: () => this.queue.listPending(),
      push: op => this.api.setVerified(op.creditId, op.verified),
      markSynced: localId => this.queue.markSynced(localId),
      markError: (localId, error) => this.queue.markError(localId, error),
      label: op => String(op.clientName || op.reference || op.creditId),
      extractError: error => this.coordinator.extractErrorMessage(error)
    });
  }
}
