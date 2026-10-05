import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';
import { RmCreditCarnetVerificationOp } from './rm-credit-carnet-verification.models';

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationQueueService {
  private readonly store: RmOfflineOpsQueueStore<RmCreditCarnetVerificationOp>;
  readonly ops$: Observable<RmCreditCarnetVerificationOp[]>;

  constructor(storage: Storage) {
    this.store = new RmOfflineOpsQueueStore(
      storage,
      'rm_credit_carnet_verifications',
      (a, b) => a.creditId === b.creditId
    );
    this.ops$ = this.store.ops$;
  }

  listPending(): Promise<RmCreditCarnetVerificationOp[]> {
    return this.store.listPending();
  }

  pendingCount(): number {
    return this.store.pendingCount();
  }

  upsert(op: RmCreditCarnetVerificationOp): Promise<void> {
    return this.store.upsert(op);
  }

  markSynced(localId: string): Promise<void> {
    return this.store.markSynced(localId);
  }

  markError(localId: string, error: string): Promise<void> {
    return this.store.markError(localId, error);
  }

  clearAll(): Promise<void> {
    return this.store.clearAll();
  }
}
