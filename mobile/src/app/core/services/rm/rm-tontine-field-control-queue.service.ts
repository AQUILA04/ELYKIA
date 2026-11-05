import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RmTontineFieldControlOp } from './rm-tontine-field-control.models';
import { RmLocalStore } from './rm-local-store.service';

const QUEUE_KEY = 'rm_tontine_field_controls';

@Injectable({ providedIn: 'root' })
export class RmTontineFieldControlQueueService {
  private readonly opsSubject = new BehaviorSubject<RmTontineFieldControlOp[]>([]);
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
    const ops = await this.store.loadOps<RmTontineFieldControlOp>(QUEUE_KEY);
    this.opsSubject.next(ops);
  }

  async listAll(): Promise<RmTontineFieldControlOp[]> {
    await this.ensureReady();
    return [...this.opsSubject.value];
  }

  async listPending(): Promise<RmTontineFieldControlOp[]> {
    await this.ensureReady();
    return this.opsSubject.value.filter(o => !o.isSync);
  }

  pendingCount(): number {
    return this.opsSubject.value.filter(o => !o.isSync).length;
  }

  async upsert(op: RmTontineFieldControlOp): Promise<void> {
    await this.ensureReady();
    const next = [...this.opsSubject.value];
    let idx = next.findIndex(o => o.localId === op.localId || o.reference === op.reference);
    if (idx < 0) {
      idx = next.findIndex(o => !o.isSync && o.tontineMemberId === op.tontineMemberId);
    }
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

  async clearAll(): Promise<void> {
    await this.ensureReady();
    await this.persist([]);
  }

  private async persist(ops: RmTontineFieldControlOp[]): Promise<void> {
    await this.store.saveOps(QUEUE_KEY, ops);
    this.opsSubject.next(ops);
  }
}
