import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { RmCloseOp } from './rm-close.models';

const QUEUE_KEY = 'rm_close_ops';

@Injectable({ providedIn: 'root' })
export class RmCloseQueueService {
  private readonly opsSubject = new BehaviorSubject<RmCloseOp[]>([]);
  readonly ops$ = this.opsSubject.asObservable();
  private ready: Promise<void>;

  constructor(private readonly storage: Storage) {
    this.ready = this.hydrate();
  }

  private async hydrate(): Promise<void> {
    await this.storage.create();
    const ops = (await this.storage.get(QUEUE_KEY)) as RmCloseOp[] | null;
    this.opsSubject.next(Array.isArray(ops) ? ops : []);
  }

  async list(): Promise<RmCloseOp[]> {
    await this.ready;
    return [...this.opsSubject.value];
  }

  async listPending(): Promise<RmCloseOp[]> {
    return (await this.list()).filter(o => !o.isSync);
  }

  pendingCount(): number {
    return this.opsSubject.value.filter(o => !o.isSync).length;
  }

  async upsert(op: RmCloseOp): Promise<void> {
    await this.ready;
    const next = [...this.opsSubject.value];
    const idx = next.findIndex(o => o.localId === op.localId || o.reference === op.reference);
    if (idx >= 0) {
      next[idx] = op;
    } else {
      next.unshift(op);
    }
    await this.persist(next);
  }

  async markSynced(reference: string): Promise<void> {
    await this.ready;
    const next = this.opsSubject.value.map(o =>
      o.reference === reference ? { ...o, isSync: true, lastError: null } : o
    );
    await this.persist(next);
  }

  async markError(reference: string, error: string): Promise<void> {
    await this.ready;
    const next = this.opsSubject.value.map(o =>
      o.reference === reference ? { ...o, lastError: error } : o
    );
    await this.persist(next);
  }

  async clearSynced(): Promise<void> {
    await this.ready;
    const next = this.opsSubject.value.filter(o => !o.isSync);
    await this.persist(next);
  }

  async clearAll(): Promise<void> {
    await this.ready;
    await this.persist([]);
  }

  private async persist(ops: RmCloseOp[]): Promise<void> {
    await this.storage.set(QUEUE_KEY, ops);
    this.opsSubject.next(ops);
  }
}
