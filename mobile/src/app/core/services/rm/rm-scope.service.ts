import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { FieldDayPlan, RmOfflinePack } from './rm.models';
import { RmLocalStore } from './rm-local-store.service';

const PLAN_KEY = 'rm_field_plan';
const PACK_KEY = 'rm_offline_pack';
const PACK_AT_KEY = 'rm_pack_downloaded_at';

@Injectable({ providedIn: 'root' })
export class RmScopeService {
  private readonly planSubject = new BehaviorSubject<FieldDayPlan | null>(null);
  private readonly packSubject = new BehaviorSubject<RmOfflinePack | null>(null);
  private hydratePromise: Promise<void> | null = null;

  readonly plan$ = this.planSubject.asObservable();
  readonly pack$ = this.packSubject.asObservable();

  constructor(
    private readonly storage: Storage,
    private readonly store: RmLocalStore
  ) {
    void this.hydrate();
    this.store.watchRestore(() => this.reload());
  }

  private async hydrate(): Promise<void> {
    if (!this.hydratePromise) {
      this.hydratePromise = this.readFromStore();
    }
    return this.hydratePromise;
  }

  private async reload(): Promise<void> {
    this.hydratePromise = this.readFromStore();
    await this.hydratePromise;
  }

  private async readFromStore(): Promise<void> {
    const planRaw = await this.store.loadScope(PLAN_KEY);
    const packRaw = await this.store.loadScope(PACK_KEY);
    this.planSubject.next(parseJson<FieldDayPlan>(planRaw));
    this.packSubject.next(parseJson<RmOfflinePack>(packRaw));
  }

  getPlan(): FieldDayPlan | null {
    return this.planSubject.value;
  }

  getPack(): RmOfflinePack | null {
    return this.packSubject.value;
  }

  getCommercialUsernames(): string[] {
    return this.planSubject.value?.commercialUsernames ?? [];
  }

  getQuarters(): string[] {
    return this.planSubject.value?.quarters ?? [];
  }

  async setPlan(plan: FieldDayPlan): Promise<void> {
    await this.hydrate();
    await this.store.saveScope(PLAN_KEY, JSON.stringify(plan));
    this.planSubject.next(plan);
  }

  async setPack(pack: RmOfflinePack): Promise<void> {
    await this.hydrate();
    await this.store.saveScope(PACK_KEY, JSON.stringify(pack));
    await this.store.saveScope(PACK_AT_KEY, new Date().toISOString());
    this.packSubject.next(pack);
  }

  async clear(): Promise<void> {
    await this.hydrate();
    await this.store.removeScope(PLAN_KEY);
    await this.store.removeScope(PACK_KEY);
    await this.store.removeScope(PACK_AT_KEY);
    await this.storage.remove(PLAN_KEY);
    await this.storage.remove(PACK_KEY);
    await this.storage.remove(PACK_AT_KEY);
    this.planSubject.next(null);
    this.packSubject.next(null);
  }

  async hasActivePlanWithPack(): Promise<boolean> {
    await this.hydrate();
    const plan = this.planSubject.value;
    const pack = this.packSubject.value;
    if (!plan || plan.status !== 'ACTIVE' || !pack) {
      return false;
    }
    const today = new Date().toISOString().slice(0, 10);
    return plan.planDate === today && pack.planId === plan.id;
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
