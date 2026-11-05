import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RmCloseOp } from './rm-close.models';
import { RmLocalStore } from './rm-local-store.service';

const QUEUE_KEY = 'rm_close_ops';

@Injectable({ providedIn: 'root' })
export class RmCloseQueueService {
  private readonly opsSubject = new BehaviorSubject<RmCloseOp[]>([]);
  readonly ops$ = this.opsSubject.asObservable();
  private ready: Promise<void> | null = null;

  constructor(private readonly store: RmLocalStore) {
    this.store.watchRestore(() => {
      this.ready = this.hydrate();
      return this.ready;
    });
  }

  private ensureReady(): Promise<void> {
    if (!this.ready) {
      this.ready = this.hydrate();
    }
    return this.ready;
  }

  private async hydrate(): Promise<void> {
    const ops = await this.store.loadOps<RmCloseOp>(QUEUE_KEY);
    this.opsSubject.next(ops);
  }

  async list(): Promise<RmCloseOp[]> {
    await this.ensureReady();
    return [...this.opsSubject.value];
  }

  async listAll(): Promise<RmCloseOp[]> {
    return this.list();
  }

  async listPending(): Promise<RmCloseOp[]> {
    return (await this.list()).filter(o => !o.isSync);
  }

  pendingCount(): number {
    return this.opsSubject.value.filter(o => !o.isSync).length;
  }

  async upsert(op: RmCloseOp): Promise<void> {
    await this.ensureReady();
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
    await this.ensureReady();
    const next = this.opsSubject.value.map(o =>
      o.reference === reference ? { ...o, isSync: true, lastError: null, syncErrorId: null } : o
    );
    await this.persist(next);
  }

  async markError(reference: string, error: string, syncErrorId?: string | null): Promise<void> {
    await this.ensureReady();
    const next = this.opsSubject.value.map(o =>
      o.reference === reference
        ? { ...o, lastError: error, syncErrorId: syncErrorId ?? o.syncErrorId ?? null }
        : o
    );
    await this.persist(next);
  }

  async clearSynced(): Promise<void> {
    await this.ensureReady();
    const next = this.opsSubject.value.filter(o => !o.isSync);
    await this.persist(next);
  }

  async clearAll(): Promise<void> {
    await this.ensureReady();
    await this.persist([]);
  }

  private async persist(ops: RmCloseOp[]): Promise<void> {
    await this.store.saveOps(QUEUE_KEY, ops);
    this.opsSubject.next(ops);
  }
}
