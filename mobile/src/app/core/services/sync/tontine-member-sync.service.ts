import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TontineMemberRepository } from '../../repositories/tontine-member.repository';
import { TontineMemberRepositoryExtensions } from '../../repositories/tontine-member.repository.extensions';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { TontineMember } from '../../../models/tontine.model';
import { TontineMemberSyncRequest, TontineMemberSyncResponse } from '../../../models/sync.model';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseSyncService } from './base-sync.service';

@Injectable({
    providedIn: 'root'
})
export class TontineMemberSyncService extends BaseSyncService<TontineMember, TontineMemberRepository> {
    private failedClientIds: string[] = [];

    constructor(
        protected override http: HttpClient,
        protected override repository: TontineMemberRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService,
        private tontineMemberRepositoryExtensions: TontineMemberRepositoryExtensions
    ) {
        super(http, repository, authService, syncErrorService, 'tontine-member');
    }

    setFailedClientIds(ids: string[]) {
        this.failedClientIds = ids;
    }

    override async syncBatch(limit: number = 50, failedClientIds: string[] = []): Promise<{ success: number; errors: number; failedIds: string[] }> {
        const unsyncedMembers = await this.fetchUnsynced(limit);

        let success = 0;
        let errors = 0;
        const failedIds: string[] = [];

        const clientIdsToCheck = failedClientIds.length > 0 ? failedClientIds : this.failedClientIds;

        for (const member of unsyncedMembers) {
            if (clientIdsToCheck.includes(member.clientId)) {
                errors++;
                await this.syncErrorService.logSyncError(
                    'tontine-member',
                    member.id,
                    'SKIP',
                    new Error('Parent client failed sync'),
                    member,
                    `Membre Tontine ${member.id}`,
                    member
                );
                continue;
            }

            try {
                await this.syncSingle(member);
                success++;
            } catch (error) {
                errors++;
                failedIds.push(member.id);
                await this.handleError(member.id, 'CREATE', error, member, `Membre Tontine ${member.id}`);
            }
        }

        return { success, errors, failedIds };
    }

    async syncSingle(item: TontineMember): Promise<any> {
        if (item.isLocal) {
            return this.syncSingleTontineMember(item);
        } else {
            return this.updateSingleTontineMember(item);
        }
    }

    protected override async fetchUnsynced(limit: number): Promise<TontineMember[]> {
        const commercialUsername = this.authService.currentUser?.username || '';
        if (!commercialUsername) return [];

        const page = await this.tontineMemberRepositoryExtensions.findByCommercialPaginated(
            commercialUsername,
            0,
            limit,
            { isSync: false }
        );
        return page.content;
    }

    private async syncSingleTontineMember(member: TontineMember): Promise<TontineMemberSyncResponse> {
        const syncRequest = await this.prepareTontineMemberSyncRequest(member);
        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.post<ApiResponse<TontineMemberSyncResponse>>(`${this.baseUrl}/api/v1/tontines/members`, syncRequest, { headers })
        );

        if (!response || !response.data) {
            throw new Error(response?.message || 'Invalid response from server for tontine member sync');
        }

        const syncedMember = response.data;
        await this.repository.saveIdMapping(member.id, syncedMember.id.toString(), 'tontine-member');
        await this.repository.markAsSynced(member.id, syncedMember.id.toString());

        return syncedMember;
    }

    private async updateSingleTontineMember(member: TontineMember): Promise<TontineMemberSyncResponse> {
        const syncRequest = await this.prepareTontineMemberSyncRequest(member);
        const headers = this.getAuthHeaders();

        const response = await firstValueFrom(
            this.http.put<ApiResponse<TontineMemberSyncResponse>>(`${this.baseUrl}/api/v1/tontines/members/${member.id}`, syncRequest, { headers })
        );

        if (!response || !response.data) {
            throw new Error(response?.message || 'Invalid response from server for tontine member update');
        }

        // Just mark as synced (isSync=1)
        await this.repository.markAsSynced(member.id, member.id);

        return response.data;
    }

    private async prepareTontineMemberSyncRequest(member: TontineMember): Promise<TontineMemberSyncRequest> {
        const clientServerId = await this.repository.getServerId(member.clientId, 'client');
        if (!clientServerId) {
            throw new Error(`Impossible de trouver l'ID serveur pour le client local ${member.clientId}`);
        }
        return {
            clientId: parseInt(clientServerId, 10),
            frequency: member.frequency,
            amount: member.amount,
            notes: member.notes
        };
    }
}
