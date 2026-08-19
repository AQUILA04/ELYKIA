import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { ConnectivityService } from '../connectivity.service';
import { RmCollectorAssignApiService } from './rm-collector-assign-api.service';
import { RmCollectorOption } from './rm-collector-assign.models';
import { RmScopeService } from './rm-scope.service';

const CACHE_KEY = 'rm_collectors_cache';

@Injectable({ providedIn: 'root' })
export class RmCollectorsCacheService {
  private readonly collectorsSubject = new BehaviorSubject<RmCollectorOption[]>([]);
  readonly collectors$ = this.collectorsSubject.asObservable();
  private ready: Promise<void>;

  constructor(
    private readonly storage: Storage,
    private readonly api: RmCollectorAssignApiService,
    private readonly connectivity: ConnectivityService,
    private readonly scope: RmScopeService
  ) {
    this.ready = this.hydrate();
  }

  private async hydrate(): Promise<void> {
    await this.storage.create();
    const cached = (await this.storage.get(CACHE_KEY)) as RmCollectorOption[] | null;
    this.collectorsSubject.next(Array.isArray(cached) ? cached : []);
  }

  async list(): Promise<RmCollectorOption[]> {
    await this.ready;
    const cached = this.collectorsSubject.value;
    if (cached.length > 0) {
      return cached;
    }
    return this.fallbackFromPack();
  }

  async refreshFromApi(): Promise<RmCollectorOption[]> {
    const collectors = await this.api.listPromoters();
    await this.ready;
    await this.storage.set(CACHE_KEY, collectors);
    this.collectorsSubject.next(collectors);
    return collectors;
  }

  async refreshIfOnline(): Promise<RmCollectorOption[]> {
    try {
      const reachable = await this.connectivity.checkBackendReachable();
      if (!reachable) {
        return this.list();
      }
      return await this.refreshFromApi();
    } catch {
      return this.list();
    }
  }

  private fallbackFromPack(): RmCollectorOption[] {
    const commercials = this.scope.getPack()?.commercials || [];
    return commercials.map(c => ({
      username: c.username,
      displayName: c.displayName || c.username
    }));
  }
}
