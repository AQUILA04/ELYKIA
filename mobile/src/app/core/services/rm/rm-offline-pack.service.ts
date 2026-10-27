import { Injectable } from '@angular/core';
import { RmFieldPlanApiService } from './rm-field-plan-api.service';
import { RmScopeService } from './rm-scope.service';
import { RmCollectorsCacheService } from './rm-collectors-cache.service';
import { RmFieldControlQueueService } from './rm-field-control-queue.service';
import { RmTontineFieldControlQueueService } from './rm-tontine-field-control-queue.service';
import { mergePendingControlsIntoPack } from './rm-pack-control-merge.util';
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
    private readonly collectorsCache: RmCollectorsCacheService,
    private readonly creditControls: RmFieldControlQueueService,
    private readonly tontineControls: RmTontineFieldControlQueueService
  ) {}

  async restoreTodayPlanIfExists(): Promise<RmPackDownloadResult | null> {
    const existing = await this.api.getTodayPlan();
    if (existing?.status !== 'ACTIVE') {
      return null;
    }
    await this.scope.setPlan(existing);
    const pack = await this.rememberPack(await this.api.downloadOfflinePack(existing.id, true));
    await this.cacheCollectorsQuietly();
    return this.withWarning(pack);
  }

  async createPlanAndDownload(request: FieldDayPlanRequest): Promise<RmPackDownloadResult> {
    const existing = await this.api.getTodayPlan();
    const plan =
      existing?.status === 'ACTIVE'
        ? await this.api.updatePlan(existing.id, request)
        : await this.api.createPlan(request);
    await this.scope.setPlan(plan);
    const pack = await this.rememberPack(await this.api.downloadOfflinePack(plan.id, true));
    await this.cacheCollectorsQuietly();
    return this.withWarning(pack);
  }

  async refreshPack(): Promise<RmPackDownloadResult> {
    const plan = this.scope.getPlan();
    if (!plan?.id) {
      throw new Error('Aucun plan actif');
    }
    const pack = await this.rememberPack(await this.api.downloadOfflinePack(plan.id, true));
    await this.cacheCollectorsQuietly();
    return this.withWarning(pack);
  }

  /**
   * Le pack serveur contient déjà le dernier contrôle de chaque dossier.
   * On y réapplique les contrôles encore en file, puis on le mémorise.
   */
  private async rememberPack(downloaded: RmOfflinePack): Promise<RmOfflinePack> {
    const [creditOps, tontineOps] = await Promise.all([
      this.creditControls.listPending(),
      this.tontineControls.listPending()
    ]);
    const pack = mergePendingControlsIntoPack(downloaded, creditOps, tontineOps);
    await this.scope.setPack(pack);
    return pack;
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
