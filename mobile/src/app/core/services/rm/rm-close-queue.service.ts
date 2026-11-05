import { Injectable } from '@angular/core';
import { RmCloseOp } from './rm-close.models';
import { RmLocalStore } from './rm-local-store.service';
import { RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';

@Injectable({ providedIn: 'root' })
export class RmCloseQueueService extends RmOfflineOpsQueueStore<RmCloseOp> {
  constructor(store: RmLocalStore) {
    super(store, 'rm_close_ops', (a, b) => a.reference === b.reference, (op) => op.reference);
  }

  list(): Promise<RmCloseOp[]> {
    return this.listAll();
  }

  clearSynced(): Promise<void> {
    return this.keep(op => !op.isSync);
  }
}
