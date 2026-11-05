import { BehaviorSubject, Observable } from 'rxjs';
import { RmLocalStore } from './rm-local-store.service';

export interface RmOfflineOpBase {
  localId: string;
  isSync: boolean;
  lastError?: string | null;
  syncErrorId?: string | null;
}

/**
 * File d'opérations hors ligne persistée dans SQLite (rm_offline_ops).
 */
export class RmOfflineOpsQueueStore<T extends RmOfflineOpBase> {
  private readonly opsSubject = new BehaviorSubject<T[]>([]);
  readonly ops$: Observable<T[]> = this.opsSubject.asObservable();
  private ready: Promise<void> | null = null;

  constructor(
    private readonly store: RmLocalStore,
    private readonly queueKey: string,
    private readonly sameEntity: (a: T, b: T) => boolean,
    private readonly syncKey: (op: T) => string = (op) => op.localId
  ) {
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
    const ops = await this.store.loadOps<T>(this.queueKey);
    this.opsSubject.next(Array.isArray(ops) ? ops : []);
  }

  async listAll(): Promise<T[]> {
    await this.ensureReady();
    return [...this.opsSubject.value];
  }

  async listPending(): Promise<T[]> {
    await this.ensureReady();
    return this.opsSubject.value.filter(o => !o.isSync);
  }

  pendingCount(): number {
    return this.opsSubject.value.filter(o => !o.isSync).length;
  }

  async upsert(op: T): Promise<void> {
    await this.ensureReady();
    const next = [...this.opsSubject.value];
    const idx = next.findIndex(o => o.localId === op.localId || this.sameEntity(o, op));
    if (idx >= 0) {
      next[idx] = op;
    } else {
      next.unshift(op);
    }
    await this.persist(next);
  }

  async markSynced(key: string): Promise<void> {
    await this.ensureReady();
    const next = this.opsSubject.value.map(o =>
      this.syncKey(o) === key ? { ...o, isSync: true, lastError: null, syncErrorId: null } : o
    );
    await this.persist(next);
  }

  async markError(key: string, error: string, syncErrorId?: string | null): Promise<void> {
    await this.ensureReady();
    const next = this.opsSubject.value.map(o =>
      this.syncKey(o) === key
        ? { ...o, lastError: error, syncErrorId: syncErrorId ?? o.syncErrorId ?? null }
        : o
    );
    await this.persist(next);
  }

  protected async keep(match: (op: T) => boolean): Promise<void> {
    await this.ensureReady();
    await this.persist(this.opsSubject.value.filter(match));
  }

  async clearAll(): Promise<void> {
    await this.ensureReady();
    await this.persist([]);
  }

  private async persist(ops: T[]): Promise<void> {
    await this.store.saveOps(this.queueKey, ops);
    this.opsSubject.next(ops);
  }
}
