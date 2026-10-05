import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { RmOfflineOpsQueueBase } from './rm-offline-ops-queue.base';
import { RmCreditCarnetVerificationOp } from './rm-credit-carnet-verification.models';

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationQueueService extends RmOfflineOpsQueueBase<RmCreditCarnetVerificationOp> {
  protected readonly queueKey = 'rm_credit_carnet_verifications';

  constructor(storage: Storage) {
    super(storage);
  }

  protected sameEntity(a: RmCreditCarnetVerificationOp, b: RmCreditCarnetVerificationOp): boolean {
    return a.creditId === b.creditId;
  }
}
