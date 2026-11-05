import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';
import { RmLocalStore } from './rm-local-store.service';
import { RmCreditCarnetVerificationOp } from './rm-credit-carnet-verification.models';

@Injectable({ providedIn: 'root' })
export class RmCreditCarnetVerificationQueueService {
  private readonly store: RmOfflineOpsQueueStore<RmCreditCarnetVerificationOp>;
  readonly ops$: Observable<RmCreditCarnetVerificationOp[]>;

  constructor(localStore: RmLocalStore) {
    this.store = new RmOfflineOpsQueueStore(
      localStore,
      'rm_credit_carnet_verifications',
      (a, b) => a.creditId === b.creditId
    );
    this.ops$ = this.store.ops$;
  }

  listAll(): Promise<RmCreditCarnetVerificationOp[]> {
    return this.store.listAll();
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

  markError(localId: string, error: string, syncErrorId?: string | null): Promise<void> {
    return this.store.markError(localId, error, syncErrorId);
  }

  clearAll(): Promise<void> {
    return this.store.clearAll();
  }
}
