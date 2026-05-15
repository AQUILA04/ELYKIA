import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { environment } from '../../../../environments/environment';
import { DateFilter } from '../../models/date-filter.model';
import { ReliquatRepository } from '../reliquat.repository';
import { DatabaseService } from '../database.service';
import { ReliquatSyncUnit, ReliquatSyncRequest, ReliquatSyncResponse } from '../../../models/sync.model';

@Injectable({
    providedIn: 'root'
})
export class ReliquatSyncService {
    private baseUrl = environment.apiUrl;
    private failedClientIds: string[] = [];

    constructor(
        private http: HttpClient,
        private repository: ReliquatRepository,
        private authService: AuthService,
        private syncErrorService: SyncErrorService,
        private databaseService: DatabaseService
    ) { }

    setFailedClientIds(ids: string[]) {
        this.failedClientIds = ids;
    }

    async getUnsyncedCount(): Promise<number> {
        const commercialId = this.authService.currentUser?.username || '';
        if (!commercialId) return 0;
        const unsynced = await this.repository.findUnsynced(commercialId);
        return unsynced.length;
    }

    async getUpdatedCount(): Promise<number> {
        return 0; // Not applicable for reliquats locally
    }

    /**
     * Synchronize all unsynced reliquats
     * Note: We batch them in a single request for optimization, as per the previous logic.
     */
    async syncAll(batchSize: number = 50, dateFilter?: DateFilter): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const commercialId = this.authService.currentUser?.username || '';
        const result = { success: 0, errors: 0, failedIds: [] as string[] };
        if (!commercialId) return result;

        const unsyncedReliquats = await this.repository.findUnsynced(commercialId);
        if (unsyncedReliquats.length === 0) return result;

        const reliquatsToSync: ReliquatSyncUnit[] = [];

        for (const reliquat of unsyncedReliquats) {
            if (this.failedClientIds.includes(reliquat.clientId)) {
                result.errors++;
                result.failedIds.push(reliquat.id);
                const error = new Error(`Synchronisation ignorée car le client parent a échoué.`);
                await this.syncErrorService.logSyncError(
                    'reliquat' as any, 
                    reliquat.id, 
                    'SKIP', 
                    error, 
                    reliquat, 
                    `Reliquat Client ${reliquat.clientId}`, 
                    reliquat
                );
                continue;
            }

            const serverClientId = await this.getServerIdForEntity(reliquat.clientId, 'client');
            if (serverClientId) {
                reliquatsToSync.push({
                    id: reliquat.id,
                    clientId: parseInt(serverClientId, 10),
                    totalAmount: reliquat.totalAmount,
                    lastRecoveryId: reliquat.lastRecoveryId || '',
                    lastAccountedDate: reliquat.lastAccountedDate || new Date().toISOString()
                });
            } else {
                result.errors++;
                result.failedIds.push(reliquat.id);
                await this.syncErrorService.logSyncError(
                    'reliquat' as any, 
                    reliquat.id, 
                    'SKIP', 
                    new Error('Parent client not synced'), 
                    reliquat, 
                    `Reliquat Client ${reliquat.clientId}`, 
                    reliquat
                );
            }
        }

        if (reliquatsToSync.length > 0) {
            const syncRequest: ReliquatSyncRequest = {
                commercialId: commercialId,
                reliquats: reliquatsToSync
            };
            
            try {
                const headers = this.getAuthHeaders();
                const response = await firstValueFrom(
                    this.http.post<{ data: ReliquatSyncResponse }>(`${this.baseUrl}/api/v1/mobiles/reliquats/sync`, syncRequest, { headers })
                );

                if (response?.data && response.data.successReliquatIds) {
                    for (const id of response.data.successReliquatIds) {
                        await this.repository.markAsSynced(id);
                        result.success++;
                    }
                }
            } catch (error) {
                // Si la requête globale échoue, on marque toutes les requêtes incluses en erreur
                for (const r of reliquatsToSync) {
                    result.errors++;
                    result.failedIds.push(r.id);
                    await this.syncErrorService.logSyncError(
                        'reliquat' as any, 
                        r.id, 
                        'CREATE', 
                        error, 
                        syncRequest, 
                        `Reliquat Client ${r.clientId}`, 
                        r
                    );
                }
            }
        }

        return result;
    }

    private getAuthHeaders(): HttpHeaders {
        const user = this.authService.currentUser;
        const token = user?.accessToken;
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
    }

    private async getServerIdForEntity(localId: string, entityType: string): Promise<string | null> {
        if (!localId) return null;
        const result = await this.databaseService.query(
            'SELECT serverId FROM id_mappings WHERE localId = ? AND entityType = ?',
            [localId, entityType]
        );
        if (result?.values && result.values.length > 0) {
            return result.values[0].serverId;
        }
        if (/^\d+$/.test(localId)) {
            return localId;
        }
        return null;
    }
}
