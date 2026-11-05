import { Injectable } from '@angular/core';
import { RmTontineFieldControlOp } from './rm-tontine-field-control.models';
import { RmLocalStore } from './rm-local-store.service';
import { RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';

@Injectable({ providedIn: 'root' })
export class RmTontineFieldControlQueueService extends RmOfflineOpsQueueStore<RmTontineFieldControlOp> {
  constructor(store: RmLocalStore) {
    super(
      store,
      'rm_tontine_field_controls',
      (a, b) => a.reference === b.reference || (!a.isSync && a.tontineMemberId === b.tontineMemberId),
      (op) => op.reference
    );
  }
}
