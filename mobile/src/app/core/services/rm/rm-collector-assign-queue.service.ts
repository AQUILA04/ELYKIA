import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { RmCollectorAssignOp } from './rm-collector-assign.models';

const QUEUE_KEY = 'rm_collector_assign_ops';

@Injectable({ providedIn: 'root' })
export class RmCollectorAssignQueueService {
  private readonly opsSubject = new BehaviorSubject<RmCollectorAssignOp[]>([]);
  readonly ops$ = this.opsSubject.asObservable();
  private ready: Promise<void>;

  constructor(private readonly storage: Storage) {
    this.ready = this.hydrate();
  }

  private async hydrate(): Promise<void> {
    await this.storage.create();
    const ops = (await this.storage.get(QUEUE_KEY)) as RmCollectorAssignOp[] | null;
    this.opsSubject.next(Array.isArray(ops) ? ops : []);
  }

  async listPending(): Promise<RmCollectorAssignOp[]> {
    await this.ready;
    return this.opsSubject.value.filter(o => !o.isSync);
  }

  pendingCount(): number {
    return this.opsSubject.value.filter(o => !o.isSync).length;
  }

  async upsert(op: RmCollectorAssignOp): Promise<void> {
    await this.ready;
    const next = [...this.opsSubject.value];
    const idx = next.findIndex(o => o.localId === op.localId);
    if (idx >= 0) {
      next[idx] = op;
    } else {
      next.unshift(op);
    }
    await this.persist(next);
  }

  async markSynced(localId: string): Promise<void> {
    await this.ready;
    const next = this.opsSubject.value.map(o =>
      o.localId === localId ? { ...o, isSync: true, lastError: null } : o
    );
    await this.persist(next);
  }

  async markError(localId: string, error: string): Promise<void> {
    await this.ready;
    const next = this.opsSubject.value.map(o =>
      o.localId === localId ? { ...o, lastError: error } : o
    );
    await this.persist(next);
  }

  async clearAll(): Promise<void> {
    await this.ready;
    await this.persist([]);
  }

  private async persist(ops: RmCollectorAssignOp[]): Promise<void> {
    await this.storage.set(QUEUE_KEY, ops);
    this.opsSubject.next(ops);
  }
}
