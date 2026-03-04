import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RecoveryRepository } from '../../repositories/recovery.repository';
import { RecoveryRepositoryExtensions } from '../../repositories/recovery.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { Recovery } from '../../../models/recovery.model';
import { DefaultDailyStakeRequest, SpecialDailyStakeRequest, SpecialDailyStakeResponse } from '../../../models/sync.model';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseSyncService } from './base-sync.service';

@Injectable({
    providedIn: 'root'
})
export class RecoverySyncService extends BaseSyncService<Recovery, RecoveryRepository> {
    private failedClientIds: string[] = [];
    private failedDistributionIds: string[] = [];


    constructor(
        protected override http: HttpClient,
        protected override repository: RecoveryRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService,
        private recoveryRepositoryExtensions: RecoveryRepositoryExtensions
    ) {
        super(http, repository, authService, syncErrorService, 'recovery');
    }

    setFailedClientIds(ids: string[]) {
        this.failedClientIds = ids;
    }

    setFailedDistributionIds(ids: string[]) {
        this.failedDistributionIds = ids;
    }

    /**
     * Synchronize all unsynced recoveries
     * Overridden to handle batching and dependencies
     */
    override async syncBatch(limit: number = 100, failedClientIds: string[] = [], failedDistributionIds: string[] = []): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const unsyncedRecoveries = await this.fetchUnsynced(limit);

        const validRecoveries: Recovery[] = [];
        let success = 0;
        let errors = 0;
        const failedIds: string[] = [];

        const clientIdsToCheck = failedClientIds.length > 0 ? failedClientIds : this.failedClientIds;
        const distIdsToCheck = failedDistributionIds.length > 0 ? failedDistributionIds : this.failedDistributionIds;

        for (const recovery of unsyncedRecoveries) {
            if (clientIdsToCheck.includes(recovery.clientId)) {
                errors++;
                await this.syncErrorService.logSyncError('recovery', recovery.id, 'SKIP', new Error('Parent client failed sync'), recovery, `Recovery ${recovery.id}`, recovery);
            } else if (distIdsToCheck.includes(recovery.distributionId)) {
                errors++;
                await this.syncErrorService.logSyncError('recovery', recovery.id, 'SKIP', new Error('Parent distribution failed sync'), recovery, `Recovery ${recovery.id}`, recovery);
            } else {
                validRecoveries.push(recovery);
            }
        }

        // Split into default and special stakes
        const defaultStakes = validRecoveries.filter(r => r.isDefaultStake);
        const specialStakes = validRecoveries.filter(r => !r.isDefaultStake);

        // Sync Default Stakes (Batch)
        if (defaultStakes.length > 0) {
            try {
                await this.syncDefaultDailyStakes(defaultStakes);
                success += defaultStakes.length;
            } catch (error) {
                errors += defaultStakes.length;
                defaultStakes.forEach(r => failedIds.push(r.id));
                // Error logging is done inside syncDefaultDailyStakes catch block
            }
        }

        // Sync Special Stakes (Batch)
        if (specialStakes.length > 0) {
            try {
                await this.syncSpecialDailyStakes(specialStakes);
                success += specialStakes.length;
            } catch (error) {
                errors += specialStakes.length;
                specialStakes.forEach(r => failedIds.push(r.id));
            }
        }

        return { success, errors, failedIds };
    }

    async syncSingle(item: Recovery): Promise<any> {
        // Recovery usually synced in batch.
        // Implement single sync by creating a batch of 1.
        if (item.isDefaultStake) {
            return this.syncDefaultDailyStakes([item]);
        } else {
            return this.syncSpecialDailyStakes([item]);
        }
    }

    protected override async fetchUnsynced(limit: number): Promise<Recovery[]> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return [];

        const page = await this.recoveryRepositoryExtensions.findByCommercialPaginated(
            commercialUsername,
            0,
            limit,
            { isSync: false }
        );
        return page.content;
    }

    private async syncDefaultDailyStakes(recoveries: Recovery[]): Promise<void> {
        const stakeUnits = [];
        const currentUser = this.authService.currentUser;

        for (const recovery of recoveries) {
            const distributionServerId = await this.repository.getServerId(recovery.distributionId, 'distribution');
            if (distributionServerId) {
                stakeUnits.push({
                    creditId: parseInt(distributionServerId),
                    recoveryId: recovery.id
                });
            }
        }

        if (stakeUnits.length === 0) return;

        const syncRequest: DefaultDailyStakeRequest = {
            collector: currentUser?.username || '',
            stakeUnits
        };

        const headers = this.getAuthHeaders();

        try {
            const response = await firstValueFrom(
                this.http.post<ApiResponse<string[]>>(`${this.baseUrl}/api/v1/credits/default-daily-stake`, syncRequest, { headers })
            );

            if (response?.data && Array.isArray(response.data)) {
                const syncedRecoveryIds = response.data;
                for (const recoveryId of syncedRecoveryIds) {
                    await this.repository.markAsSynced(recoveryId);
                }
            }
        } catch (error) {
            for (const recovery of recoveries) {
                await this.syncErrorService.logSyncError('recovery', recovery.id, 'CREATE', error, syncRequest, `Recovery ${recovery.id}`, recovery);
            }
            throw error;
        }
    }

    private async syncSpecialDailyStakes(recoveries: Recovery[]): Promise<void> {
        const stakeUnits = [];
        const currentUser = this.authService.currentUser;

        for (const recovery of recoveries) {
            if (recovery.clientId && recovery.distributionId) {
                const clientServerId = await this.repository.getServerId(recovery.clientId, 'client');
                const distributionServerId = await this.repository.getServerId(recovery.distributionId, 'distribution');

                if (clientServerId && distributionServerId) {
                    const parsedCreditId = parseInt(distributionServerId, 10);
                    const parsedClientId = parseInt(clientServerId, 10);

                    if (!isNaN(parsedCreditId) && !isNaN(parsedClientId)) {
                        stakeUnits.push({
                            amount: recovery.amount,
                            creditId: parsedCreditId,
                            clientId: parsedClientId,
                            recoveryId: recovery.id
                        });
                    }
                }
            }
        }

        if (stakeUnits.length === 0) return;

        const syncRequest: SpecialDailyStakeRequest = {
            collector: currentUser?.username || '',
            stakeUnits
        };

        const headers = this.getAuthHeaders();

        try {
            const response = await firstValueFrom(
                this.http.post<ApiResponse<SpecialDailyStakeResponse>>(`${this.baseUrl}/api/v1/credits/special-daily-stake`, syncRequest, { headers })
            );

            if (response?.data) {
                const result = response.data;

                // Handle successful recoveries
                if (result.successRecoveryIds && Array.isArray(result.successRecoveryIds)) {
                    for (const recoveryId of result.successRecoveryIds) {
                        await this.repository.markAsSynced(recoveryId);
                    }
                }

                // Handle failed recoveries
                if (result.failedRecoveries && Array.isArray(result.failedRecoveries)) {
                    for (const failed of result.failedRecoveries) {
                        const recovery = recoveries.find(r => r.id === failed.recoveryId);
                        if (recovery) {
                            await this.syncErrorService.logSyncError(
                                'recovery',
                                recovery.id,
                                'CREATE',
                                new Error(failed.errorMessage),
                                syncRequest,
                                `Recovery ${recovery.id}`,
                                recovery
                            );
                        }
                    }
                }
            }
        } catch (error) {
            // Fallback for global errors (network, etc.)
            for (const recovery of recoveries) {
                await this.syncErrorService.logSyncError('recovery', recovery.id, 'CREATE', error, syncRequest, `Recovery ${recovery.id}`, recovery);
            }
            throw error;
        }
    }
}
