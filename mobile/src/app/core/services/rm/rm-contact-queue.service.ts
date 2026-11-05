import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RmContactPatch } from './rm-contact.models';
import { RmLocalStore } from './rm-local-store.service';
import { RmOfflineOpsQueueStore } from './rm-offline-ops-queue.base';

@Injectable({ providedIn: 'root' })
export class RmContactQueueService extends RmOfflineOpsQueueStore<RmContactPatch> {
  constructor(store: RmLocalStore) {
    super(
      store,
      'rm_client_contact_patches',
      (a, b) => a.reference === b.reference,
      (op) => op.reference
    );
  }

  get patches$(): Observable<RmContactPatch[]> {
    return this.ops$;
  }
}
