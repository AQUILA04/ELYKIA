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
import { Store } from '@ngrx/store';
import * as AccountActions from '../../../store/account/account.actions';
import { isExistingAccountMessage, presentExistingAccountNotice } from './existing-account-message';

@Injectable({
    providedIn: 'root'
})
export class AccountSyncService extends BaseSyncService<Account, AccountRepository> {

    constructor(
        protected override http: HttpClient,
        protected override repository: AccountRepository,
        protected override authService: AuthService,
        protected override syncErrorService: SyncErrorService,
        private readonly store: Store
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

            try {
                const response = await firstValueFrom(
                    this.http.post<ApiResponse<AccountSyncResponse>>(`${this.baseUrl}/api/v1/accounts/sync`, syncRequest, { headers })
                );

                if (!response || !response.data) {
                    throw new Error(response?.message || 'Invalid response from server');
                }

                await this.applyServerAccount(account, response.data, response.message);
                return response.data;
            } catch (error) {
                const recovered = await this.recoverExistingAccount(account, error);
                if (recovered) {
                    return recovered;
                }
                throw error;
            }
        } else {
            const responseData = await this.postUpdateAccount(account, clientIdNumber);
            await this.repository.updateSyncStatus(account.id, true);
            this.store.dispatch(AccountActions.accountSyncSuccess({
                localId: account.id,
                serverId: account.id
            }));
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

    private async applyServerAccount(account: Account, serverAccount: AccountSyncResponse, message?: string): Promise<void> {
        const serverId = serverAccount.id.toString();
        await this.repository.saveIdMapping(account.id, serverId, 'account');
        await this.repository.adoptServerAccount(account.id, serverAccount);
        this.store.dispatch(AccountActions.accountSyncSuccess({
            localId: account.id,
            serverId
        }));
        if (isExistingAccountMessage(message)) {
            await presentExistingAccountNotice(message as string);
        }
    }

    /**
     * Un conflit explicite qui contient le compte existant est repris comme un succès :
     * le téléphone aligne le client sur ce compte et affiche le message du serveur.
     */
    private async recoverExistingAccount(account: Account, error: unknown): Promise<AccountSyncResponse | null> {
        const body = (error as { error?: { message?: string; data?: AccountSyncResponse } })?.error;
        const data = body?.data;
        if (!data?.id || !isExistingAccountMessage(body?.message)) {
            return null;
        }
        await this.applyServerAccount(account, data, body?.message);
        return data;
    }

    protected override getAuthHeaders(): HttpHeaders {
        return super.getAuthHeaders();
    }
}
