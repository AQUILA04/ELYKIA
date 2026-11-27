import { Injectable } from '@angular/core';
import { RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';
import { RmLocalStore } from './rm-local-store.service';
import { RmSocietyShareOp } from './rm-society-share.models';

/** Parts société validées ou corrigées hors ligne : une seule saisie en attente par membre (la dernière). */
@Injectable({ providedIn: 'root' })
export class RmSocietyShareQueueService extends RmOfflineOpsQueueStore<RmSocietyShareOp> {
  constructor(store: RmLocalStore) {
    super(store, 'rm_tontine_society_shares', (a, b) => a.tontineMemberId === b.tontineMemberId);
  }
}
