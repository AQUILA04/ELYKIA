import { Injectable } from '@angular/core';
import { DistributionRepository } from '../../repositories/distribution.repository';
import { DistributionService } from '../../services/distribution.service';
import { LocalDataCleanupHandler } from './local-data-cleanup-handler.interface';
import {
  LocalDataCleanupDateContext,
  LocalDataCleanupEntityType,
  LocalDataCleanupItem
} from '../models/local-data-cleanup.model';
import { Distribution } from '../../../models/distribution.model';

@Injectable({ providedIn: 'root' })
export class DistributionLocalCleanupHandler implements LocalDataCleanupHandler {
  readonly entityType = LocalDataCleanupEntityType.Distribution;
  readonly sectionTitle = 'Distributions locales';

  constructor(
    private readonly distributionRepository: DistributionRepository,
    private readonly distributionService: DistributionService
  ) {}

  async findStaleItems(
    commercialUsername: string,
    context: LocalDataCleanupDateContext
  ): Promise<LocalDataCleanupItem[]> {
    const distributions = await this.distributionRepository.findLocalDistributionsForCleanup(
      commercialUsername,
      context.todayDate,
      context.retentionStartDate
    );
    return distributions.map(dist => this.toCleanupItem(dist));
  }

  async purgeExpiredItems(
    commercialUsername: string,
    context: LocalDataCleanupDateContext
  ): Promise<LocalDataCleanupItem[]> {
    const distributions = await this.distributionRepository.findLocalDistributionsForCleanup(
      commercialUsername,
      context.retentionStartDate
    );
    if (distributions.length === 0) {
      return [];
    }

    const items = distributions.map(dist => this.toCleanupItem(dist));
    const ids = items.map(item => item.id);
    await this.distributionService.deleteLocalDistributionsByIds(ids, commercialUsername);
    return items;
  }

  async deleteItems(ids: string[], commercialUsername: string): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.distributionService.deleteLocalDistributionsByIds(ids, commercialUsername);
  }

  private toCleanupItem(dist: Distribution): LocalDataCleanupItem {
    return {
      id: dist.id,
      entityType: this.entityType,
      title: dist.clientName || dist.reference || `Distribution ${dist.id}`,
      subtitle: dist.reference || undefined,
      amount: dist.totalAmount,
      date: dist.createdAt
    };
  }
}
