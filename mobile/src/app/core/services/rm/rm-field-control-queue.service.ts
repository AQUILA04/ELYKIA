import { Injectable } from '@angular/core';
import { RmFieldControlOp } from './rm-field-control.models';
import { RmLocalStore } from './rm-local-store.service';
import { RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';

@Injectable({ providedIn: 'root' })
export class RmFieldControlQueueService extends RmOfflineOpsQueueStore<RmFieldControlOp> {
  constructor(store: RmLocalStore) {
    super(
      store,
      'rm_field_controls',
      (a, b) => a.reference === b.reference || (!a.isSync && a.creditId === b.creditId),
      (op) => op.reference
    );
  }
}
