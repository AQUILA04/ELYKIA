import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DistributionRepository } from '../../repositories/distribution.repository';
import { DistributionRepositoryExtensions } from '../../repositories/distribution.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { Distribution } from '../../../models/distribution.model';
import { DistributionSyncRequest, DistributionSyncResponse } from '../../../models/sync.model';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseSyncService } from './base-sync.service';

@Injectable({
    providedIn: 'root'
})
export class DistributionSyncService extends BaseSyncService<Distribution, DistributionRepository> {
    private failedClientIds: string[] = [];


    constructor(
        protected override http: HttpClient,
        protected override repository: DistributionRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService,
        private distributionRepositoryExtensions: DistributionRepositoryExtensions
    ) {
        super(http, repository, authService, syncErrorService, 'distribution');
    }

    setFailedClientIds(ids: string[]) {
        this.failedClientIds = ids;
    }

    /**
     * Synchronize a batch of unsynced distributions
     * Overridden to handle failedClientIds dependency
     */
    override async syncBatch(limit: number = 20, failedClientIds: string[] = []): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const unsyncedDistributions = await this.fetchUnsynced(limit);

        let success = 0;
        let errors = 0;
        const failedIds: string[] = [];

        // Use local failedClientIds if not provided as argument
        const clientIdsToCheck = failedClientIds.length > 0 ? failedClientIds : this.failedClientIds;

        for (const distribution of unsyncedDistributions) {
            if (clientIdsToCheck.includes(distribution.clientId)) {
                errors++;
                await this.syncErrorService.logSyncError(
                    'distribution',
                    distribution.id,
                    'SKIP',
                    new Error('Parent client failed sync'),
                    distribution,
                    `Distribution ${distribution.reference || distribution.id}`,
                    distribution
                );
                continue;
            }

            try {
                await this.syncSingle(distribution);
                success++;
            } catch (error) {
                errors++;
                failedIds.push(distribution.id);
                await this.handleError(distribution.id, 'CREATE', error, distribution, `Distribution ${distribution.reference || distribution.id}`);
            }
        }

        return { success, errors, failedIds };
    }

    async syncSingle(item: Distribution): Promise<any> {
        return this.syncSingleDistribution(item);
    }

    protected override async fetchUnsynced(limit: number): Promise<Distribution[]> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return [];

        const page = await this.distributionRepositoryExtensions.findByCommercialPaginated(
            commercialUsername,
            0,
            limit,
            { isSync: false }
        );
        return page.content;
    }

    private async syncSingleDistribution(distribution: Distribution): Promise<DistributionSyncResponse> {
        const syncRequest = await this.prepareDistributionSyncRequest(distribution);
        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.patch<ApiResponse<DistributionSyncResponse>>(`${this.baseUrl}/api/v1/credits/distribute-articles`, syncRequest, { headers })
        );

        if (!response || !response.data) {
            throw new Error(response?.message || 'Invalid response from server for distribution sync');
        }

        const syncedDistribution = response.data;

        await this.repository.saveIdMapping(distribution.id, syncedDistribution.id.toString(), 'distribution');
        await this.repository.updateSyncStatus(distribution.id, true);

        return syncedDistribution;
    }

    private async prepareDistributionSyncRequest(distribution: Distribution): Promise<DistributionSyncRequest> {
        const items = await this.repository.getItemsForDistribution(distribution.id);
        const clientServerId = await this.repository.getServerId(distribution.clientId, 'client');

        return {
            articles: {
                articleEntries: items.map(item => ({
                    articleId: parseInt(item.articleId),
                    quantity: item.quantity
                }))
            },
            clientId: parseInt(clientServerId || '0'),
            creditId: parseInt(distribution.creditId || '0'),
            advance: distribution.advance || 0,
            dailyStake: distribution.dailyPayment || 0,
            startDate: distribution.startDate || new Date().toISOString(),
            endDate: distribution.endDate || new Date().toISOString(),
            totalAmount: distribution.totalAmount || 0,
            totalAmountPaid: distribution.paidAmount || 0,
            totalAmountRemaining: distribution.remainingAmount || 0,
            mobile: true,
            reference: distribution.reference || distribution.id
        };
    }
}
