import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AccountRepository } from '../../repositories/account.repository';
import { AuthService } from '../auth.service';
import { SyncErrorService } from '../sync-error.service';
import { Account } from '../../../models/account.model';
import { AccountSyncRequest, AccountSyncResponse, AccountUpdateRequest } from '../../../models/sync.model';
import { ApiResponse } from '../../../models/api-response.model';
import { BaseSyncService } from './base-sync.service';

@Injectable({
    providedIn: 'root'
})
export class AccountSyncService extends BaseSyncService<Account, AccountRepository> {

    constructor(
        protected override http: HttpClient,
        protected override repository: AccountRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService
    ) {
        super(http, repository, authService, syncErrorService, 'account');
    }

    async syncSingle(account: Account): Promise<AccountSyncResponse> {
        // Resolve client server ID
        let finalServerClientId = account.clientId;
        const mappedClientId = await this.repository.getServerId(account.clientId, 'client');
        if (mappedClientId) {
            finalServerClientId = mappedClientId;
        }

        if (!finalServerClientId) {
            throw new Error(`Server Client ID not found for local client ID ${account.clientId}`);
        }

        // clientId in AccountSyncRequest is number
        const clientIdNumber = parseInt(finalServerClientId, 10);
        if (isNaN(clientIdNumber)) {
            throw new Error(`Invalid Server Client ID ${finalServerClientId}, expected number`);
        }

        const headers = this.getAuthHeaders();

        if (account.isLocal) {
            // CREATE (POST)
            const syncRequest: AccountSyncRequest = {
                id: null,
                clientId: clientIdNumber,
                accountNumber: account.accountNumber,
                accountBalance: account.accountBalance,
                status: account.status || 'ACTIVE'
            };

            const response = await firstValueFrom(
                this.http.post<ApiResponse<AccountSyncResponse>>(`${this.baseUrl}/api/v1/accounts/sync`, syncRequest, { headers })
            );

            if (!response || !response.data) {
                throw new Error(response?.message || 'Invalid response from server');
            }

            const serverId = response.data.id.toString();

            await this.repository.saveIdMapping(account.id, serverId, 'account');
            await this.repository.updateSyncStatus(account.id, true);

            return response.data;
        } else {
            const responseData = await this.postUpdateAccount(account, clientIdNumber);
            await this.repository.updateSyncStatus(account.id, true);
            return responseData;
        }
    }

    /**
     * Met à jour un compte sur le serveur sans modifier SQLite (online-first).
     */
    async postUpdateAccount(account: Account, clientIdNumber?: number): Promise<AccountSyncResponse> {
        let resolvedClientId = clientIdNumber;
        if (resolvedClientId === undefined) {
            let finalServerClientId = account.clientId;
            const mappedClientId = await this.repository.getServerId(account.clientId, 'client');
            if (mappedClientId) {
                finalServerClientId = mappedClientId;
            }
            resolvedClientId = parseInt(finalServerClientId, 10);
            if (isNaN(resolvedClientId)) {
                throw new Error(`Invalid Server Client ID ${finalServerClientId}, expected number`);
            }
        }

        const serverId = parseInt(account.id, 10);
        if (isNaN(serverId)) {
            throw new Error(`Invalid Server Account ID ${account.id} for update`);
        }

        const updateRequest: AccountUpdateRequest = {
            id: serverId,
            clientId: resolvedClientId,
            accountNumber: account.accountNumber,
            accountBalance: account.accountBalance,
            status: account.status || 'ACTIVE'
        };

        const headers = this.getAuthHeaders();
        const response = await firstValueFrom(
            this.http.put<ApiResponse<AccountSyncResponse>>(`${this.baseUrl}/api/v1/accounts/${serverId}`, updateRequest, { headers })
        );

        if (!response || !response.data) {
            throw new Error(response?.message || 'Invalid response from server');
        }

        return response.data;
    }

    protected override getAuthHeaders(): HttpHeaders {
        return super.getAuthHeaders();
    }
}
