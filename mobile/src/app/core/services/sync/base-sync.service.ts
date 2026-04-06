import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { SyncErrorService } from '../sync-error.service';
import { AuthService } from '../auth.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseRepository } from '../../repositories/base.repository';

@Injectable({
    providedIn: 'root'
})
export abstract class BaseSyncService<T extends { id: string }, R extends BaseRepository<T, any>> {
    protected baseUrl = environment.apiUrl;

    protected constructor(
        protected http: HttpClient,
        protected repository: R,
        protected authService: AuthService,
        protected syncErrorService: SyncErrorService,
        protected entityType: 'client' | 'distribution' | 'recovery' | 'account' | 'order' | 'tontine-member' | 'tontine-collection' | 'tontine-delivery' | 'locality'
    ) { }

    /**
     * Orchestration locale par domaine.
     * Cette méthode gère la boucle de synchronisation par lots (batch)
     * et peut être surchargée pour inclure des synchronisations spécifiques.
     *
     * @param batchSize Taille du lot (défaut: 50)
     * @returns Résultat de la synchronisation incluant les IDs ayant échoué
     */
    async syncAll(batchSize: number = 50): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const result: { success: number; errors: number; failedIds: string[] } = { success: 0, errors: 0, failedIds: [] };

        // 1. Récupérer le nombre total d'éléments non synchronisés
        const totalUnsynced = await this.getUnsyncedCount();

        if (totalUnsynced === 0) {
            return result;
        }

        // 2. Calculer le nombre d'itérations nécessaires
        const totalBatches = Math.ceil(totalUnsynced / batchSize);

        // 3. Itérer sur les lots
        for (let i = 0; i < totalBatches; i++) {
            const batchResult = await this.syncBatch(batchSize);

            result.success += batchResult.success;
            result.errors += batchResult.errors;

            if (batchResult.failedIds && Array.isArray(batchResult.failedIds)) {
                result.failedIds.push(...batchResult.failedIds);
            }

            // Si un lot ne retourne rien (ex: fin de liste ou filtrage), on arrête
            if (batchResult.success + batchResult.errors === 0) {
                break;
            }
        }

        return result;
    }

    /**
     * Synchronize a batch of unsynced items
     * @param limit Batch size
     */
    async syncBatch(limit: number): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const items = await this.fetchUnsynced(limit);
        const result: { success: number; errors: number; failedIds: string[] } = { success: 0, errors: 0, failedIds: [] };

        for (const item of items) {
            try {
                await this.syncSingle(item);
                result.success++;
            } catch (error) {
                result.errors++;
                result.failedIds.push(item.id);
                await this.handleError(item.id, 'CREATE', error, item, `Error syncing ${this.entityType} ${item.id}`);
            }
        }
        return result;
    }

    /**
     * Synchronize a single item
     * @param item Item to synchronize
     */
    abstract syncSingle(item: T): Promise<any>;

    /**
     * Fetch unsynced items
     * Override this method if repository extensions are used
     */
    protected async fetchUnsynced(limit: number): Promise<T[]> {
        return this.repository.findUnsynced(this.authService.currentUser?.username || '', limit, 0);
    }

    protected getAuthHeaders(): HttpHeaders {
        const user = this.authService.currentUser;
        const token = user?.accessToken;
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
    }

    protected async handleError(entityId: string, operation: 'CREATE' | 'UPDATE' | 'DELETE', error: any, entity: any, errorMessage: string) {
        await this.syncErrorService.logSyncError(
            this.entityType,
            entityId,
            operation,
            error,
            entity,
            errorMessage,
            entity
        );
    }

    async getUnsyncedCount(): Promise<number> {
        return this.repository.countUnsynced();
    }

    async getUpdatedCount(): Promise<number> {
        return this.repository.countUpdated();
    }
}
