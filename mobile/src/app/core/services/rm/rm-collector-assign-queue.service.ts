import { Injectable } from '@angular/core';
import { RmCollectorAssignOp } from './rm-collector-assign.models';
import { RmLocalStore } from './rm-local-store.service';
import { RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';

@Injectable({ providedIn: 'root' })
export class RmCollectorAssignQueueService extends RmOfflineOpsQueueStore<RmCollectorAssignOp> {
  constructor(store: RmLocalStore) {
    super(store, 'rm_collector_assign_ops', () => false);
  }
}
