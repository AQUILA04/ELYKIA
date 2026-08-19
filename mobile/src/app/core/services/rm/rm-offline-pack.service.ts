import { Injectable } from '@angular/core';
import { RmFieldPlanApiService } from './rm-field-plan-api.service';
import { RmScopeService } from './rm-scope.service';
import { RmCollectorsCacheService } from './rm-collectors-cache.service';
import { FieldDayPlanRequest, RmOfflinePack } from './rm.models';

const VOLUME_WARNING_LATES = 400;
const VOLUME_WARNING_BYTES = 25 * 1024 * 1024;

export interface RmPackDownloadResult {
  pack: RmOfflinePack;
  volumeWarning: boolean;
  warningMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class RmOfflinePackService {
  constructor(
    private readonly api: RmFieldPlanApiService,
    private readonly scope: RmScopeService,
    private readonly collectorsCache: RmCollectorsCacheService
  ) {}

  async createPlanAndDownload(request: FieldDayPlanRequest): Promise<RmPackDownloadResult> {
    const plan = await this.api.createPlan(request);
    await this.scope.setPlan(plan);
    const pack = await this.api.downloadOfflinePack(plan.id, true);
    await this.scope.setPack(pack);
    await this.cacheCollectorsQuietly();
    return this.withWarning(pack);
  }

  async refreshPack(): Promise<RmPackDownloadResult> {
    const plan = this.scope.getPlan();
    if (!plan?.id) {
      throw new Error('Aucun plan actif');
    }
    const pack = await this.api.downloadOfflinePack(plan.id, true);
    await this.scope.setPack(pack);
    await this.cacheCollectorsQuietly();
    return this.withWarning(pack);
  }

  private async cacheCollectorsQuietly(): Promise<void> {
    try {
      await this.collectorsCache.refreshFromApi();
    } catch {
      // Pack already persisted; picker will use cache or pack.commercials.
    }
  }

  private withWarning(pack: RmOfflinePack): RmPackDownloadResult {
    const lates = pack.stats?.lateCredits ?? 0;
    const bytes = pack.stats?.estimatedBytes ?? 0;
    const volumeWarning = lates > VOLUME_WARNING_LATES || bytes > VOLUME_WARNING_BYTES;
    return {
      pack,
      volumeWarning,
      warningMessage: volumeWarning
        ? `Périmètre volumineux (${lates} retards). Le travail offline peut être plus lent.`
        : undefined
    };
  }
}
