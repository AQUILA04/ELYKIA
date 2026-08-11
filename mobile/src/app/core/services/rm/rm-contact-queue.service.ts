import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { RmContactPatch } from './rm-contact.models';

const QUEUE_KEY = 'rm_client_contact_patches';

@Injectable({ providedIn: 'root' })
export class RmContactQueueService {
  private readonly patchesSubject = new BehaviorSubject<RmContactPatch[]>([]);
  readonly patches$ = this.patchesSubject.asObservable();
  private ready: Promise<void>;

  constructor(private readonly storage: Storage) {
    this.ready = this.hydrate();
  }

  private async hydrate(): Promise<void> {
    await this.storage.create();
    const patches = (await this.storage.get(QUEUE_KEY)) as RmContactPatch[] | null;
    this.patchesSubject.next(Array.isArray(patches) ? patches : []);
  }

  async listPending(): Promise<RmContactPatch[]> {
    await this.ready;
    return this.patchesSubject.value.filter(p => !p.isSync);
  }

  pendingCount(): number {
    return this.patchesSubject.value.filter(p => !p.isSync).length;
  }

  async upsert(patch: RmContactPatch): Promise<void> {
    await this.ready;
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
    await this.ready;
    const next = this.patchesSubject.value.map(p =>
      p.reference === reference ? { ...p, isSync: true, lastError: null } : p
    );
    await this.persist(next);
  }

  async markError(reference: string, error: string): Promise<void> {
    await this.ready;
    const next = this.patchesSubject.value.map(p =>
      p.reference === reference ? { ...p, lastError: error } : p
    );
    await this.persist(next);
  }

  async clearAll(): Promise<void> {
    await this.ready;
    await this.persist([]);
  }

  private async persist(patches: RmContactPatch[]): Promise<void> {
    await this.storage.set(QUEUE_KEY, patches);
    this.patchesSubject.next(patches);
  }
}
