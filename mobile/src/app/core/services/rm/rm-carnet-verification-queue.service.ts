import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';
import { RmCarnetVerificationOp } from './rm-carnet-verification.models';

/** Tontine carnet queue — thin Angular facade over the shared store. */
@Injectable({ providedIn: 'root' })
export class RmCarnetVerificationQueueService extends RmOfflineOpsQueueStore<RmCarnetVerificationOp> {
  constructor(storage: Storage) {
    super(storage, 'rm_tontine_carnet_verifications', (a, b) => a.tontineMemberId === b.tontineMemberId);
  }
}
