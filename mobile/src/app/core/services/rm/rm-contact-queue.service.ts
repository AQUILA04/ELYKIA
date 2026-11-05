import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RmContactPatch } from './rm-contact.models';
import { RmLocalStore } from './rm-local-store.service';

const QUEUE_KEY = 'rm_client_contact_patches';

@Injectable({ providedIn: 'root' })
export class RmContactQueueService {
  private readonly patchesSubject = new BehaviorSubject<RmContactPatch[]>([]);
  readonly patches$ = this.patchesSubject.asObservable();
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
    const patches = await this.store.loadOps<RmContactPatch>(QUEUE_KEY);
    this.patchesSubject.next(patches);
  }

  async listAll(): Promise<RmContactPatch[]> {
    await this.ensureReady();
    return [...this.patchesSubject.value];
  }

  async listPending(): Promise<RmContactPatch[]> {
    await this.ensureReady();
    return this.patchesSubject.value.filter(p => !p.isSync);
  }

  pendingCount(): number {
    return this.patchesSubject.value.filter(p => !p.isSync).length;
  }

  async upsert(patch: RmContactPatch): Promise<void> {
    await this.ensureReady();
    const next = [...this.patchesSubject.value];
    const idx = next.findIndex(p => p.localId === patch.localId || p.reference === patch.reference);
    if (idx >= 0) {
      next[idx] = patch;
    } else {
      next.unshift(patch);
    }
    await this.persist(next);
  }

  async markSynced(reference: string): Promise<void> {
    await this.ensureReady();
    const next = this.patchesSubject.value.map(p =>
      p.reference === reference ? { ...p, isSync: true, lastError: null, syncErrorId: null } : p
    );
    await this.persist(next);
  }

  async markError(reference: string, error: string, syncErrorId?: string | null): Promise<void> {
    await this.ensureReady();
    const next = this.patchesSubject.value.map(p =>
      p.reference === reference
        ? { ...p, lastError: error, syncErrorId: syncErrorId ?? p.syncErrorId ?? null }
        : p
    );
    await this.persist(next);
  }

  async clearAll(): Promise<void> {
    await this.ensureReady();
    await this.persist([]);
  }

  private async persist(patches: RmContactPatch[]): Promise<void> {
    await this.store.saveOps(QUEUE_KEY, patches);
    this.patchesSubject.next(patches);
  }
}
