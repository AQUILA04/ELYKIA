import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { RmOfflineOpsQueueBase } from './rm-offline-ops-queue.base';
import { RmCarnetVerificationOp } from './rm-carnet-verification.models';

@Injectable({ providedIn: 'root' })
export class RmCarnetVerificationQueueService extends RmOfflineOpsQueueBase<RmCarnetVerificationOp> {
  protected readonly queueKey = 'rm_tontine_carnet_verifications';

  constructor(storage: Storage) {
    super(storage);
  }

  protected sameEntity(a: RmCarnetVerificationOp, b: RmCarnetVerificationOp): boolean {
    return a.tontineMemberId === b.tontineMemberId;
  }
}
