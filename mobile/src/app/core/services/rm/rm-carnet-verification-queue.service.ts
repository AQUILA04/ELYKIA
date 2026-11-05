import { Injectable } from '@angular/core';
import { RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';
import { RmLocalStore } from './rm-local-store.service';
import { RmCarnetVerificationOp } from './rm-carnet-verification.models';

/** Tontine carnet queue — thin Angular facade over the shared store. */
@Injectable({ providedIn: 'root' })
export class RmCarnetVerificationQueueService extends RmOfflineOpsQueueStore<RmCarnetVerificationOp> {
  constructor(store: RmLocalStore) {
    super(store, 'rm_tontine_carnet_verifications', (a, b) => a.tontineMemberId === b.tontineMemberId);
  }
}
