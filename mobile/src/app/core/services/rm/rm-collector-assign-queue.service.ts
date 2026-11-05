import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RmCollectorAssignOp } from './rm-collector-assign.models';
import { RmLocalStore } from './rm-local-store.service';

const QUEUE_KEY = 'rm_collector_assign_ops';

@Injectable({ providedIn: 'root' })
export class RmCollectorAssignQueueService {
  private readonly opsSubject = new BehaviorSubject<RmCollectorAssignOp[]>([]);
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
    const ops = await this.store.loadOps<RmCollectorAssignOp>(QUEUE_KEY);
    this.opsSubject.next(ops);
  }

  async listAll(): Promise<RmCollectorAssignOp[]> {
    await this.ensureReady();
    return [...this.opsSubject.value];
  }

  async listPending(): Promise<RmCollectorAssignOp[]> {
    await this.ensureReady();
    return this.opsSubject.value.filter(o => !o.isSync);
  }

  pendingCount(): number {
    return this.opsSubject.value.filter(o => !o.isSync).length;
  }

  async upsert(op: RmCollectorAssignOp): Promise<void> {
    await this.ensureReady();
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
    await this.ensureReady();
    const next = this.opsSubject.value.map(o =>
      o.localId === localId ? { ...o, isSync: true, lastError: null, syncErrorId: null } : o
    );
    await this.persist(next);
  }

  async markError(localId: string, error: string, syncErrorId?: string | null): Promise<void> {
    await this.ensureReady();
    const next = this.opsSubject.value.map(o =>
      o.localId === localId
        ? { ...o, lastError: error, syncErrorId: syncErrorId ?? o.syncErrorId ?? null }
        : o
    );
    await this.persist(next);
  }

  async clearAll(): Promise<void> {
    await this.ensureReady();
    await this.persist([]);
  }

  private async persist(ops: RmCollectorAssignOp[]): Promise<void> {
    await this.store.saveOps(QUEUE_KEY, ops);
    this.opsSubject.next(ops);
  }
}
