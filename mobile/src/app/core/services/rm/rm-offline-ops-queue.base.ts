import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';

export interface RmOfflineOpBase {
  localId: string;
  isSync: boolean;
  lastError: string | null;
}

/**
 * Shared Ionic Storage queue for RM offline ops (lazy hydrate — no async in constructor).
 */
export abstract class RmOfflineOpsQueueBase<T extends RmOfflineOpBase> {
  private readonly opsSubject = new BehaviorSubject<T[]>([]);
  readonly ops$ = this.opsSubject.asObservable();
  private ready: Promise<void> | null = null;

  protected abstract readonly queueKey: string;

  /** Stable business key used to replace a pending op for the same entity. */
  protected abstract sameEntity(a: T, b: T): boolean;

  protected constructor(protected readonly storage: Storage) {}

  private ensureReady(): Promise<void> {
    if (!this.ready) {
      this.ready = this.hydrate();
    }
    return this.ready;
  }

  private async hydrate(): Promise<void> {
    await this.storage.create();
    const ops = (await this.storage.get(this.queueKey)) as T[] | null;
    this.opsSubject.next(Array.isArray(ops) ? ops : []);
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

  async markSynced(localId: string): Promise<void> {
    await this.ensureReady();
    const next = this.opsSubject.value.map(o =>
      o.localId === localId ? { ...o, isSync: true, lastError: null } : o
    );
    await this.persist(next);
  }

  async markError(localId: string, error: string): Promise<void> {
    await this.ensureReady();
    const next = this.opsSubject.value.map(o =>
      o.localId === localId ? { ...o, lastError: error } : o
    );
    await this.persist(next);
  }

  async clearAll(): Promise<void> {
    await this.ensureReady();
    await this.persist([]);
  }

  private async persist(ops: T[]): Promise<void> {
    await this.storage.set(this.queueKey, ops);
    this.opsSubject.next(ops);
  }
}
