import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RecoveryRepository } from '../../repositories/recovery.repository';
import { RecoveryRepositoryExtensions } from '../../repositories/recovery.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { Recovery } from '../../../models/recovery.model';
import {
    UnifiedRecoveryBatchRequest,
    UnifiedRecoveryBatchResponse,
    UnifiedRecoveryUnit
} from '../../../models/sync.model';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseSyncService } from './base-sync.service';
import { DateFilter } from '../../models/date-filter.model';

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

    private syncConsentCode: string | undefined;

    setFailedClientIds(ids: string[]) {
        this.failedClientIds = ids;
    }

    setFailedDistributionIds(ids: string[]) {
        this.failedDistributionIds = ids;
    }

    setSyncConsentCode(code: string) {
        this.syncConsentCode = code;
    }

    /**
     * Synchronize all unsynced recoveries via the unified batch endpoint.
     */
    override async syncBatch(limit: number = 100, dateFilter?: DateFilter): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const unsyncedRecoveries = await this.fetchUnsynced(limit, dateFilter);

        const validRecoveries: Recovery[] = [];
        let errors = 0;
        const failedIds: string[] = [];

        for (const recovery of unsyncedRecoveries) {
            if (this.failedClientIds.includes(recovery.clientId)) {
                errors++;
                failedIds.push(recovery.id);
                await this.syncErrorService.logSyncError('recovery', recovery.id, 'SKIP', new Error('Parent client failed sync'), recovery, `Recovery ${recovery.id}`, recovery);
            } else if (this.failedDistributionIds.includes(recovery.distributionId)) {
                errors++;
                failedIds.push(recovery.id);
                await this.syncErrorService.logSyncError('recovery', recovery.id, 'SKIP', new Error('Parent distribution failed sync'), recovery, `Recovery ${recovery.id}`, recovery);
            } else {
                validRecoveries.push(recovery);
            }
        }

        if (validRecoveries.length === 0) {
            return { success: 0, errors, failedIds };
        }

        try {
            const batchOutcome = await this.syncRecoveriesBatch(validRecoveries);
            return {
                success: batchOutcome.success,
                errors: errors + batchOutcome.errors,
                failedIds: [...failedIds, ...batchOutcome.failedIds]
            };
        } catch {
            validRecoveries.forEach(r => failedIds.push(r.id));
            return {
                success: 0,
                errors: errors + validRecoveries.length,
                failedIds
            };
        }
    }

    async syncSingle(item: Recovery): Promise<any> {
        return this.syncRecoveriesBatch([item]);
    }

    /**
     * Envoie un encaissement au serveur sans mettre à jour SQLite (online-first).
     */
    async postCreateRecovery(recovery: Recovery): Promise<void> {
        await this.postRecoveriesOnline([recovery]);
    }

    protected override async fetchUnsynced(limit: number, dateFilter?: DateFilter): Promise<Recovery[]> {
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

    /**
     * Sync recoveries that belong to closed distributions.
     * This is critical to ensure the server closes the old distribution before a new one is created.
     */
    async syncClosingRecoveries(): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return { success: 0, errors: 0, failedIds: [] };

        const closingRecoveries = await this.repository.findUnsyncedForClosedDistributions(commercialUsername);

        if (closingRecoveries.length === 0) {
            return { success: 0, errors: 0, failedIds: [] };
        }

        try {
            return await this.syncRecoveriesBatch(closingRecoveries);
        } catch {
            return {
                success: 0,
                errors: closingRecoveries.length,
                failedIds: closingRecoveries.map(r => r.id)
            };
        }
    }

    private async buildUnifiedUnits(recoveries: Recovery[]): Promise<UnifiedRecoveryUnit[]> {
        const units: UnifiedRecoveryUnit[] = [];

        for (const recovery of recoveries) {
            const distributionServerId = await this.repository.getServerId(recovery.distributionId, 'distribution');
            if (!distributionServerId) {
                continue;
            }
            const parsedCreditId = Number.parseInt(distributionServerId, 10);
            if (Number.isNaN(parsedCreditId)) {
                continue;
            }

            let parsedClientId: number | undefined;
            if (recovery.clientId) {
                const clientServerId = await this.repository.getServerId(recovery.clientId, 'client');
                if (clientServerId) {
                    const candidate = Number.parseInt(clientServerId, 10);
                    if (!Number.isNaN(candidate)) {
                        parsedClientId = candidate;
                    }
                }
            }

            units.push({
                creditId: parsedCreditId,
                ...(parsedClientId !== undefined ? { clientId: parsedClientId } : {}),
                amount: recovery.amount,
                recoveryId: recovery.id,
                reliquatGeneratedAmount: recovery.reliquatGeneratedAmount || 0,
                reliquatUsedAmount: recovery.reliquatUsedAmount || 0,
                operationConsentCode: recovery.operationConsentCode ?? null,
                confirmedAmount: recovery.confirmedAmount ?? null
            });
        }

        return units;
    }

    private async syncRecoveriesBatch(recoveries: Recovery[]): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const units = await this.buildUnifiedUnits(recoveries);
        if (units.length === 0) {
            return { success: 0, errors: 0, failedIds: [] };
        }

        const currentUser = this.authService.currentUser;
        const syncRequest: UnifiedRecoveryBatchRequest = {
            collector: currentUser?.username || '',
            syncConsentCode: this.syncConsentCode ?? null,
            source: 'MOBILE_SYNC',
            recoveries: units
        };

        const headers = this.getAuthHeaders();
        let success = 0;
        let errors = 0;
        const failedIds: string[] = [];

        try {
            const response = await firstValueFrom(
                this.http.post<ApiResponse<UnifiedRecoveryBatchResponse>>(
                    `${this.baseUrl}/api/v1/credits/recoveries/batch`,
                    syncRequest,
                    { headers }
                )
            );

            if (response?.data) {
                const result = response.data;

                if (result.successRecoveryIds && Array.isArray(result.successRecoveryIds)) {
                    for (const recoveryId of result.successRecoveryIds) {
                        await this.repository.markAsSynced(recoveryId);
                        success++;
                    }
                }

                if (result.failedRecoveries && Array.isArray(result.failedRecoveries)) {
                    for (const failed of result.failedRecoveries) {
                        errors++;
                        failedIds.push(failed.recoveryId);
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
            return { success, errors, failedIds };
        } catch (error) {
            for (const recovery of recoveries) {
                await this.syncErrorService.logSyncError('recovery', recovery.id, 'CREATE', error, syncRequest, `Recovery ${recovery.id}`, recovery);
            }
            throw error;
        }
    }

    private async postRecoveriesOnline(recoveries: Recovery[]): Promise<void> {
        const units = await this.buildUnifiedUnits(recoveries);

        if (units.length === 0) {
            throw new Error('Impossible de synchroniser l\'encaissement : crédit parent introuvable sur le serveur.');
        }

        const currentUser = this.authService.currentUser;
        const syncRequest: UnifiedRecoveryBatchRequest = {
            collector: currentUser?.username || '',
            syncConsentCode: this.syncConsentCode ?? null,
            source: 'MOBILE_SYNC',
            recoveries: units
        };

        const headers = this.getAuthHeaders();
        const response = await firstValueFrom(
            this.http.post<ApiResponse<UnifiedRecoveryBatchResponse>>(
                `${this.baseUrl}/api/v1/credits/recoveries/batch`,
                syncRequest,
                { headers }
            )
        );

        this.assertRecoveryPushSuccess(recoveries, response?.data?.successRecoveryIds, response?.data?.failedRecoveries);
    }

    private assertRecoveryPushSuccess(
        recoveries: Recovery[],
        successRecoveryIds?: string[],
        failedRecoveries?: Array<{ recoveryId: string; errorMessage: string }>
    ): void {
        for (const recovery of recoveries) {
            const failed = failedRecoveries?.find((item) => item.recoveryId === recovery.id);
            if (failed) {
                throw new Error(failed.errorMessage || `Échec de l'encaissement ${recovery.id}`);
            }
            if (successRecoveryIds && !successRecoveryIds.includes(recovery.id)) {
                throw new Error(`L'encaissement ${recovery.id} n'a pas été confirmé par le serveur.`);
            }
        }
    }
}
