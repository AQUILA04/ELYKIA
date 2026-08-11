import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { FieldDayPlan, RmOfflinePack } from './rm.models';

const PLAN_KEY = 'rm_field_plan';
const PACK_KEY = 'rm_offline_pack';
const PACK_AT_KEY = 'rm_pack_downloaded_at';

@Injectable({ providedIn: 'root' })
export class RmScopeService {
  private readonly planSubject = new BehaviorSubject<FieldDayPlan | null>(null);
  private readonly packSubject = new BehaviorSubject<RmOfflinePack | null>(null);

  readonly plan$ = this.planSubject.asObservable();
  readonly pack$ = this.packSubject.asObservable();

  constructor(private readonly storage: Storage) {
    void this.hydrate();
  }

  private async hydrate(): Promise<void> {
    await this.storage.create();
    const plan = await this.storage.get(PLAN_KEY);
    const pack = await this.storage.get(PACK_KEY);
    if (plan) {
      this.planSubject.next(plan as FieldDayPlan);
    }
    if (pack) {
      this.packSubject.next(pack as RmOfflinePack);
    }
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
    await this.storage.set(PLAN_KEY, plan);
    this.planSubject.next(plan);
  }

  async setPack(pack: RmOfflinePack): Promise<void> {
    await this.storage.set(PACK_KEY, pack);
    await this.storage.set(PACK_AT_KEY, new Date().toISOString());
    this.packSubject.next(pack);
  }

  async clear(): Promise<void> {
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
