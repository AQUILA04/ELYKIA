import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of, throwError, forkJoin, firstValueFrom } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';

import { DatabaseService } from './database.service';
import { AuthService } from './auth.service';
import { SyncErrorService } from './sync-error.service';
import { environment } from '../../../environments/environment';
import { Directory } from '@capacitor/filesystem';

import {
  SyncResult,
  SyncBatchResult,
  SyncProgress,
  SyncError,
  IdMapping,
  CashDeskStatus,
  ClientSyncRequest,
  AccountSyncRequest,
  DistributionSyncRequest,
  DefaultDailyStakeRequest,
  SpecialDailyStakeRequest, AccountUpdateRequest, OrderSyncRequest, OrderSyncResponse,
  TontineMemberSyncRequest,
  TontineCollectionSyncRequest,
  TontineDeliverySyncRequest,
  TontineMemberSyncResponse,
  TontineCollectionSyncResponse,
  TontineDeliverySyncResponse
} from '../../models/sync.model';

import {
  ApiResponse,
  CashDeskStatusResponse,
  ClientSyncResponse,
  AccountSyncResponse,
  DistributionSyncResponse,
  DailyStakeSyncResponse,
  ApiError
} from '../../models/api-sync-response.model';

import { Client } from '../../models/client.model';
import { Distribution } from '../../models/distribution.model';
import { Recovery } from '../../models/recovery.model';
import { Account } from '../../models/account.model';
import { Store } from '@ngrx/store';
import { updateSyncProgress } from '../../store/sync/sync.actions';
import { capSQLiteSet } from '@capacitor-community/sqlite';
import { Filesystem } from '@capacitor/filesystem';

import { LocalitySyncService } from './locality-sync.service';
import { Order } from '../../models/order.model';
import { OrderItem } from '../../models/order-item.model';
import { PhotoSyncService } from './photo-sync.service';
import { ClientPhotoUrlUpdateDto } from '../../models/client-photo-url-update.dto';
import { TontineMember, TontineCollection, TontineDelivery } from '../../models/tontine.model';

@Injectable({
  providedIn: 'root'
})
export class SynchronizationService {
  private baseUrl = environment.apiUrl;
  private idMappingCache = new Map<string, string>();
  private failedDistributionIds: string[] = [];
  private failedClientIds: string[] = [];
  private failedTontineMemberIds: string[] = [];
  private failedTontineCollectionIds: string[] = [];

  constructor(
    private http: HttpClient,
    private databaseService: DatabaseService,
    private authService: AuthService,
    private syncErrorService: SyncErrorService,
    private localitySyncService: LocalitySyncService,
    private photoSyncService: PhotoSyncService,
    private store: Store
  ) { }

  // ==================== MÉTHODES PRINCIPALES ====================

  /**
   * Synchronisation automatique complète (US010/EC009)
   */
  async synchronizeAllData(): Promise<SyncResult> {
    this.failedDistributionIds = [];
    this.failedClientIds = [];
    this.failedTontineMemberIds = [];
    this.failedTontineCollectionIds = [];
    const startTime = Date.now();
    const result: SyncBatchResult = {
      localitiesSync: { success: 0, errors: 0 },
      clientsSync: { success: 0, errors: 0 },
      updatedClientsSync: { success: 0, errors: 0 },
      updatedPhotoClientsSync: { success: 0, errors: 0 },
      updatedPhotoUrlClientsSync: { success: 0, errors: 0 },
      distributionsSync: { success: 0, errors: 0 },
      recoveriesSync: { success: 0, errors: 0 },
      accountsSync: { success: 0, errors: 0 },
      ordersSync: { success: 0, errors: 0 },
      tontineMembersSync: { success: 0, errors: 0 },
      tontineCollectionsSync: { success: 0, errors: 0 },
      tontineDeliveriesSync: { success: 0, errors: 0 },
    };

    const unsyncedLocalities = await this.databaseService.getUnsyncedLocalities();
    const unsyncedClients = await this.getUnsyncedClients();
    const updatedClients = await this.databaseService.getUpdatedClients();
    const updatedPhotoClients = await this.databaseService.getUpdatedPhotoClients();
    const updatedPhotoUrlClients = await this.photoSyncService.getClientsWithUpdatedPhotoUrls();
    const unsyncedDistributions = await this.getUnsyncedDistributions();
    const unsyncedOrders = await this.getUnsyncedOrders();
    const unsyncedRecoveries = (await this.categorizeRecoveries()).defaultStakes.length + (await this.categorizeRecoveries()).specialStakes.length;
    const unsyncedAccounts = await this.getUnsyncedAccounts();
    const updatedAccounts = await this.getUpdatedAccounts();
    const unsyncedTontineMembers = await this.getUnsyncedTontineMembers();
    const modifiedTontineMembers = await this.getModifiedTontineMembers();
    const unsyncedTontineCollections = await this.getUnsyncedTontineCollections();
    const unsyncedTontineDeliveries = await this.getUnsyncedTontineDeliveries();

    const totalItems = unsyncedLocalities.length + unsyncedClients.length + updatedClients.length + updatedPhotoClients.length + updatedPhotoUrlClients.length + unsyncedDistributions.length + unsyncedOrders.length + unsyncedRecoveries + unsyncedAccounts.length + updatedAccounts.length + unsyncedTontineMembers.length + modifiedTontineMembers.length + unsyncedTontineCollections.length + unsyncedTontineDeliveries.length;
    let processedItems = 0;

    this.store.dispatch(updateSyncProgress({ progress: { totalItems, processedItems, percentage: 0 } }));

    try {
      // 0. Vérifier et ouvrir la caisse
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'cash-check' } }));
      await this.checkAndOpenCashDesk();

      // 1. Synchroniser les localités
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'localities' } }));
      const localitySyncResult = await this.localitySyncService.syncLocalities();
      result.localitiesSync = localitySyncResult;
      processedItems += unsyncedLocalities.length;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));

      // 2. Synchroniser les clients (et leurs comptes)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'clients' } }));
      processedItems = await this.syncAllClients(result, unsyncedClients, processedItems, totalItems);

      // 2.5 Synchroniser les clients modifiés
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'updated-clients' } }));
      processedItems = await this.syncUpdatedClients(result, processedItems, totalItems);

      // 2.6 Synchroniser les photos des clients modifiés
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'updated-photo-clients' } }));
      processedItems = await this.syncUpdatedPhotoClients(result, updatedPhotoClients, processedItems, totalItems);

      // 2.7 Synchroniser les URLs de photos des clients modifiés
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'updated-photo-url-clients' } }));
      processedItems = await this.syncUpdatedPhotoUrlClients(result, updatedPhotoUrlClients, processedItems, totalItems);

      // 3. Synchroniser les comptes mis à jour
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'accounts' } }));
      processedItems = await this.syncUpdatedAccounts(result, processedItems, totalItems);

      // 4. Synchroniser les commandes
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'orders' } }));
      processedItems = await this.syncAllOrders(result, unsyncedOrders, processedItems, totalItems);

      // 5. Synchroniser les distributions
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'distributions' } }));
      processedItems = await this.syncAllDistributions(result, unsyncedDistributions, processedItems, totalItems);

      // 6. Synchroniser les recouvrements
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'recoveries' } }));
      processedItems = await this.syncAllRecoveries(result, processedItems, totalItems);

      // 6.1 Synchroniser les membres de tontine (Nouveaux)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'tontine-members' } }));
      processedItems = await this.syncAllTontineMembers(result, unsyncedTontineMembers, processedItems, totalItems);

      // 6.1.5 Synchroniser les membres de tontine (Modifiés)
      processedItems = await this.syncModifiedTontineMembers(result, modifiedTontineMembers, processedItems, totalItems);

      // 6.2 Synchroniser les collectes de tontine
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'tontine-collections' } }));
      processedItems = await this.syncAllTontineCollections(result, unsyncedTontineCollections, processedItems, totalItems);

      // 6.3 Synchroniser les livraisons de tontine
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'tontine-deliveries' } }));
      processedItems = await this.syncAllTontineDeliveries(result, unsyncedTontineDeliveries, processedItems, totalItems);

      // 7. Récupérer les mises à jour du serveur (optionnel)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'updates' } }));
      //await this.fetchServerUpdates();

      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'completed' } }));

      const duration = Date.now() - startTime;
      const totalSuccess = result.localitiesSync.success + result.clientsSync.success + result.updatedClientsSync.success + result.updatedPhotoClientsSync.success + result.updatedPhotoUrlClientsSync.success + result.distributionsSync.success + result.recoveriesSync.success + result.accountsSync.success + result.ordersSync.success + result.tontineMembersSync.success + result.tontineCollectionsSync.success + result.tontineDeliveriesSync.success;
      const totalErrors = result.localitiesSync.errors + result.clientsSync.errors + result.updatedClientsSync.errors + result.updatedPhotoClientsSync.errors + result.updatedPhotoUrlClientsSync.errors + result.distributionsSync.errors + result.recoveriesSync.errors + result.accountsSync.errors + result.ordersSync.errors + result.tontineMembersSync.errors + result.tontineCollectionsSync.errors + result.tontineDeliveriesSync.errors;

      return {
        success: totalErrors === 0,
        totalProcessed: totalSuccess + totalErrors,
        successCount: totalSuccess,
        errorCount: totalErrors,
        errors: await this.getRecentSyncErrors(),
        duration
      };

    } catch (error) {
      console.error('Erreur lors de la synchronisation complète:', error);
      throw error;
    }
  }

  // ==================== VÉRIFICATION DE CAISSE ====================

  /**
   * Vérifier le statut de la caisse et l'ouvrir si nécessaire
   */
  private async checkAndOpenCashDesk(): Promise<void> {
    try {
      const isOpened = await this.checkCashDeskStatus();

      if (!isOpened) {
        await this.openCashDesk();
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de caisse:', error);
      throw new Error('Impossible de vérifier ou d\'ouvrir la caisse');
    }
  }

  /**
   * Vérifier si la caisse est ouverte
   */
  checkCashDeskStatus(): Observable<boolean> {
    const headers = this.getAuthHeaders();

    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/api/v1/cash-desks/is-opened`, { headers })
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  /**
   * Ouvrir la caisse
   */
  openCashDesk(): Observable<CashDeskStatusResponse> {
    const headers = this.getAuthHeaders();

    return this.http.get<ApiResponse<CashDeskStatusResponse>>(`${this.baseUrl}/api/v1/cash-desks/open`, { headers })
      .pipe(
        map(response => {
          if (!response.data.isOpened) {
            throw new Error(response.message || 'Impossible d\'ouvrir la caisse');
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  // ==================== SYNCHRONISATION CLIENTS ====================

  /**
   * Synchroniser tous les clients non synchronisés
   */
  private async syncAllClients(result: SyncBatchResult, unsyncedClients: Client[], processedItems: number, totalItems: number): Promise<number> {
    for (const client of unsyncedClients) {
      let syncedClientResponse: ClientSyncResponse | null = null;
      try {
        syncedClientResponse = await this.syncSingleClient(client);
        result.clientsSync.success++;
      } catch (clientError) {
        result.clientsSync.errors++;
        this.failedClientIds.push(client.id);
        await this.logSyncError('client', client.id, 'CREATE', clientError, client, this.getClientDisplayName(client), client);
        processedItems++;
        this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
        continue; // Skip to next client
      }

      // If we are here, client sync was successful. Now sync account.
      try {
        console.log('Sync account for client id: ', client.id + ' : serverID ' + syncedClientResponse.id);
        const account = await this.getClientAccount(String(syncedClientResponse.id));
        console.log("Fetched Acoount from db: ", account);
        if (account) {
          await this.syncSingleAccount(account, syncedClientResponse.id);
          result.accountsSync.success++;
        }
      } catch (accountError) {
        result.accountsSync.errors++;
        this.failedClientIds.push(client.id);
        // Error is already logged inside syncSingleAccount
      }

      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }

  private async syncUpdatedAccounts(result: SyncBatchResult, processedItems: number, totalItems: number): Promise<number> {
    const unsyncedAccounts = await this.getUnsyncedAccounts();
    const updatedAccounts = await this.getUpdatedAccounts();
    const allAccountsToSync = [...unsyncedAccounts, ...updatedAccounts];
    console.log('[SynchronizationService.syncUpdatedAccounts]: allAccountsToSync', allAccountsToSync);

    for (const account of allAccountsToSync) {
      try {
        await this.syncSingleAccount(account);
        result.accountsSync.success++;
      } catch (error) {
        result.accountsSync.errors++;
      }
      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }

  private async syncUpdatedClients(result: SyncBatchResult, processedItems: number, totalItems: number): Promise<number> {
    const updatedClients = await this.databaseService.getUpdatedClients();

    for (const client of updatedClients) {
      try {
        const requestBody = {
          id: client.id,
          latitude: client.latitude,
          longitude: client.longitude
        };
        const headers = this.getAuthHeaders();
        const response = await firstValueFrom(
          this.http.patch<ApiResponse<boolean>>(`${this.baseUrl}/api/v1/clients/location-update`, requestBody, { headers })
        );

        if (response.statusCode === 200 && response.data === true) {
          await this.databaseService.markClientAsLocationSynced(client.id);
          result.updatedClientsSync.success++;
        } else {
          throw new Error(response.message || 'Failed to sync updated client location.');
        }
      } catch (error) {
        result.updatedClientsSync.errors++;
        await this.logSyncError('client', client.id, 'UPDATE_LOCATION', error, client, this.getClientDisplayName(client), client);
      }
      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }

  private async syncUpdatedPhotoClients(result: SyncBatchResult, updatedPhotoClients: Client[], processedItems: number, totalItems: number): Promise<number> {
    for (const client of updatedPhotoClients) {
      try {
        const requestBody = await this.prepareUpdatePhotoDto(client);
        const headers = this.getAuthHeaders();
        const response = await firstValueFrom(
          this.http.patch<ApiResponse<boolean>>(`${this.baseUrl}/api/v1/clients/photo-update`, requestBody, { headers })
        );

        if (response.statusCode === 200 && response.data === true) {
          await this.databaseService.markClientAsPhotoSynced(client.id);
          result.updatedPhotoClientsSync.success++;
        } else {
          throw new Error(response.message || 'Failed to sync updated client photo.');
        }
      } catch (error) {
        result.updatedPhotoClientsSync.errors++;
        await this.logSyncError('client', client.id, 'UPDATE_PHOTO', error, client, this.getClientDisplayName(client), client);
      }
      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }

  private async syncUpdatedPhotoUrlClients(result: SyncBatchResult, updatedPhotoUrlClients: Client[], processedItems: number, totalItems: number): Promise<number> {
    for (const client of updatedPhotoUrlClients) {
      try {
        const requestBody: ClientPhotoUrlUpdateDto = {
          id: client.id,
          profilPhotoUrl: client.profilPhotoUrl,
          cardPhotoUrl: client.cardPhotoUrl
        };

        const headers = this.getAuthHeaders();
        const response = await firstValueFrom(
          this.http.patch<ApiResponse<boolean>>(`${this.baseUrl}/api/v1/clients/update-photo-url`, requestBody, { headers })
        );

        if (response.statusCode === 200 && response.data === true) {
          await this.photoSyncService.markClientPhotoUrlsSynced(client.id);
          result.updatedPhotoUrlClientsSync.success++;
        } else {
          throw new Error(response.message || 'Failed to sync updated client photo URLs.');
        }
      } catch (error) {
        result.updatedPhotoUrlClientsSync.errors++;
        await this.logSyncError('client', client.id, 'UPDATE_PHOTO_URL', error, client, this.getClientDisplayName(client), client);
      }
      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }

  private async prepareUpdatePhotoDto(client: Client): Promise<any> {
    let profilPhotoBase64: string | undefined;
    let cardPhotoBase64: string | undefined;

    try {
      if (client.profilPhoto) {
        const file = await Filesystem.readFile({ path: client.profilPhoto, directory: Directory.ExternalStorage });
        profilPhotoBase64 = file.data as string;
      }
      if (client.cardPhoto) {
        const file = await Filesystem.readFile({ path: client.cardPhoto, directory: Directory.ExternalStorage });
        cardPhotoBase64 = file.data as string;
      }
    } catch (error) {
      console.error('Error reading image file for photo update sync', error);
      // Decide if you want to throw the error or sync without the image
    }

    return {
      clientId: client.id,
      profilPhoto: profilPhotoBase64,
      cardPhoto: cardPhotoBase64,
      cardType: client.cardType,
      cardNumber: client.cardID
    };
  }

  /**
   * Synchroniser un client individuel
   */
  async syncSingleClient(client: Client): Promise<ClientSyncResponse> {
    const syncRequest = await this.prepareClientSyncRequest(client);
    const headers = this.getAuthHeaders();

    return firstValueFrom(
      this.http.post<ApiResponse<ClientSyncResponse>>(`${this.baseUrl}/api/v1/clients`, syncRequest, { headers })
        .pipe(
          switchMap(async (response) => {
            if (!response || !response.data) {
              console.error('[SyncDebug] Invalid server response for client sync:', response);
              const errorMessage = response?.message || 'La synchronisation du client a renvoyé une réponse vide ou invalide.';
              throw new Error(errorMessage);
            }
            const syncedClient = response.data;
            console.log('[SyncDebug] Received server response for client:', syncedClient);
            await this.storeIdMapping(client.id, syncedClient.id.toString(), 'client');
            await this.markClientAsSynced(client.id, syncedClient.id.toString(), syncedClient);
            return syncedClient;
          }),
          catchError(this.handleError)
        )
    );
  }

  /**
   * Synchroniser le compte d'un client
   */
  async syncSingleAccount(account: Account, serverClientId?: number): Promise<void> {
    console.log('[SynchronizationService.syncSingleAccount]: ...')
    if (account.updated) {
      console.log('[SynchronizationService.syncSingleAccount]: UPDATED ACCOUNT...');
      // This is an updated account
      const accountServerId = account.id;

      const syncRequest = this.prepareAccountDto(account);
      const headers = this.getAuthHeaders();

      try {
        const response = await firstValueFrom(
          this.http.put<ApiResponse<AccountSyncResponse>>(`${this.baseUrl}/api/v1/accounts/${accountServerId}`, syncRequest, { headers })
        );

        // Marquer le compte comme synchronisé
        await this.markAccountAsSynced(account.id, response.data.id.toString());

      } catch (error) {
        await this.logSyncError('account', account.id, 'UPDATE', error, syncRequest, `Compte ${account.accountNumber}`, account);
        throw error;
      }

    } else {
      console.log('[SynchronizationService.syncSingleAccount]: NEW ACCOUNT...', serverClientId);
      // This is a new account
      let finalServerClientId = serverClientId;
      if (!finalServerClientId) {
        const clientId = await this.getServerIdForEntity(account.clientId, 'client');
        if (clientId) {
          finalServerClientId = parseInt(clientId, 10);
        }
      }

      if (!finalServerClientId) {
        throw new Error(`Impossible de trouver l\'ID serveur pour le client local ${account.clientId}`);
      }

      const syncRequest = this.prepareAccountSyncRequest(account, finalServerClientId);
      const headers = this.getAuthHeaders();

      try {
        const response = await firstValueFrom(
          this.http.post<ApiResponse<AccountSyncResponse>>(`${this.baseUrl}/api/v1/accounts/sync`, syncRequest, { headers })
        );

        // Marquer le compte comme synchronisé
        await this.markAccountAsSynced(account.id, response.data.id.toString());

      } catch (error) {
        await this.logSyncError('account', account.id, 'CREATE', error, syncRequest, `Compte ${account.accountNumber}`, account);
        throw error;
      }
    }
  }

  private prepareAccountDto(account: Account): AccountUpdateRequest {
    return {
      id: parseInt(account.id, 10),
      accountNumber: account.accountNumber,
      clientId: parseInt(account.clientId, 10),
      accountBalance: account.accountBalance || 0,
      status: account.status
    };
  }

  // ==================== SYNCHRONISATION DISTRIBUTIONS ====================

  /**
   * Synchroniser toutes les distributions non synchronisées
   */
  private async syncAllDistributions(result: SyncBatchResult, unsyncedDistributions: Distribution[], processedItems: number, totalItems: number): Promise<number> {

    for (const distribution of unsyncedDistributions) {
      console.log('distribution', distribution);
      if (this.failedClientIds.includes(distribution.clientId)) {
        result.distributionsSync.errors++;
        const error = new Error(`Synchronisation ignorée car le client parent (ID: ${distribution.clientId}) a échoué.`);
        await this.logSyncError('distribution', distribution.id, 'SKIP', error, distribution, this.getDistributionDisplayName(distribution), distribution);
        processedItems++;
        this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
        continue;
      }


      try {
        await this.syncSingleDistribution(distribution);
        result.distributionsSync.success++;
      } catch (error) {
        result.distributionsSync.errors++;
        this.failedDistributionIds.push(distribution.id);
        await this.logSyncError('distribution', distribution.id, 'CREATE', error, distribution, this.getDistributionDisplayName(distribution), distribution);
      }
      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }

  /**
   * Synchroniser une distribution individuelle
   */
  async syncSingleDistribution(distribution: Distribution): Promise<DistributionSyncResponse> {
    const syncRequest = await this.prepareDistributionSyncRequest(distribution);
    const headers = this.getAuthHeaders();

    return firstValueFrom(
      this.http.patch<ApiResponse<DistributionSyncResponse>>(`${this.baseUrl}/api/v1/credits/distribute-articles`, syncRequest, { headers })
        .pipe(
          switchMap(async (response) => {
            if (!response || !response.data) {
              const errorMessage = response?.message || 'La synchronisation de la distribution a renvoyé une réponse vide ou invalide.';
              throw new Error(errorMessage);
            }
            const syncedDistribution = response.data;
            await this.storeIdMapping(distribution.id, syncedDistribution.id.toString(), 'distribution');
            await this.markDistributionAsSynced(distribution.id, syncedDistribution.id.toString());
            return syncedDistribution;
          }),
          catchError(this.handleError)
        )
    );
  }
  // ==================== SYNCHRONISATION ORDERS ====================

  private async syncAllOrders(result: SyncBatchResult, unsyncedOrders: Order[], processedItems: number, totalItems: number): Promise<number> {
    for (const order of unsyncedOrders) {
      if (this.failedClientIds.includes(order.clientId)) {
        result.ordersSync.errors++;
        const error = new Error(`Synchronisation ignorée car le client parent (ID: ${order.clientId}) a échoué.`);
        await this.logSyncError('order', order.id, 'SKIP', error, order, this.getOrderDisplayName(order), order);
        processedItems++;
        this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
        continue;
      }

      try {
        await this.syncSingleOrder(order);
        result.ordersSync.success++;
      } catch (error) {
        result.ordersSync.errors++;
        await this.logSyncError('order', order.id, 'CREATE', error, order, this.getOrderDisplayName(order), order);
      }
      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }

  async syncSingleOrder(order: Order): Promise<OrderSyncResponse> {
    const syncRequest = await this.prepareOrderSyncRequest(order);
    const headers = this.getAuthHeaders();

    return firstValueFrom(
      this.http.post<ApiResponse<OrderSyncResponse>>(`${this.baseUrl}/api/v1/orders`, syncRequest, { headers })
        .pipe(
          switchMap(async (response) => {
            if (!response || !response.data) {
              const errorMessage = response?.message || 'La synchronisation de la commande a renvoyé une réponse vide ou invalide.';
              throw new Error(errorMessage);
            }
            const syncedOrder = response.data;
            await this.storeIdMapping(order.id, syncedOrder.id.toString(), 'order');
            await this.markOrderAsSynced(order.id, syncedOrder.id.toString());
            return syncedOrder;
          }),
          catchError(this.handleError)
        )
    );
  }

  // ==================== SYNCHRONISATION RECOUVREMENTS ====================

  /**
   * Synchroniser tous les recouvrements non synchronisés
   */
  private async syncAllRecoveries(result: SyncBatchResult, processedItems: number, totalItems: number): Promise<number> {
    const { defaultStakes, specialStakes } = await this.categorizeRecoveries();

    const allUnsyncedRecoveries = [...defaultStakes, ...specialStakes];
    const validRecoveries: Recovery[] = [];
    const skippedRecoveries: { recovery: Recovery, reason: string }[] = [];

    for (const recovery of allUnsyncedRecoveries) {
      if (this.failedClientIds.includes(recovery.clientId)) {
        skippedRecoveries.push({ recovery, reason: `le client parent (ID: ${recovery.clientId}) a échoué` });
      } else if (this.failedDistributionIds.includes(recovery.distributionId)) {
        skippedRecoveries.push({ recovery, reason: `la distribution parente (ID: ${recovery.distributionId}) a échoué` });
      } else {
        validRecoveries.push(recovery);
      }
    }

    if (skippedRecoveries.length > 0) {
      result.recoveriesSync.errors += skippedRecoveries.length;
      for (const skipped of skippedRecoveries) {
        const error = new Error(`Synchronisation ignorée car ${skipped.reason}.`);
        await this.logSyncError('recovery', skipped.recovery.id, 'SKIP', error, skipped.recovery, this.getRecoveryDisplayName(skipped.recovery), skipped.recovery);
      }
    }

    const validDefaultStakes = validRecoveries.filter(r => r.isDefaultStake);
    const validSpecialStakes = validRecoveries.filter(r => !r.isDefaultStake);

    // Sync default stakes
    if (validDefaultStakes.length > 0) {
      try {
        await this.syncDefaultDailyStakes(validDefaultStakes);
        result.recoveriesSync.success += validDefaultStakes.length;
      } catch (error) {
        result.recoveriesSync.errors += validDefaultStakes.length;
      }
    }

    // Sync special stakes
    if (validSpecialStakes.length > 0) {
      try {
        await this.syncSpecialDailyStakes(validSpecialStakes);
        result.recoveriesSync.success += validSpecialStakes.length;
      } catch (error) {
        result.recoveriesSync.errors += validSpecialStakes.length;
      }
    }

    processedItems += allUnsyncedRecoveries.length;
    this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    return processedItems;
  }

  /**
   * Synchroniser les mises journalières normales
   */
  public async syncDefaultDailyStakes(recoveries: Recovery[]): Promise<void> {
    const stakeUnits = [];
    const currentUser = this.authService.currentUser;

    for (const recovery of recoveries) {
      const distributionServerId = await this.getServerIdForEntity(recovery.distributionId, 'distribution');

      if (distributionServerId) {
        stakeUnits.push({
          creditId: parseInt(distributionServerId),
          recoveryId: recovery.id
        });
      }
    }

    const syncRequest: DefaultDailyStakeRequest = {
      collector: currentUser?.username || '',
      stakeUnits
    };

    const headers = this.getAuthHeaders();

    try {
      const response = await this.http.post<ApiResponse<string[]>>(`${this.baseUrl}/api/v1/credits/default-daily-stake`, syncRequest, { headers }).toPromise();

      if (response?.data && Array.isArray(response.data)) {
        const syncedRecoveryIds = response.data;
        // Marquer tous les recouvrements retournés comme synchronisés
        for (const recoveryId of syncedRecoveryIds) {
          await this.markRecoveryAsSynced(recoveryId);
        }
      }
    } catch (error) {
      for (const recovery of recoveries) {
        await this.logSyncError('recovery', recovery.id, 'CREATE', error, syncRequest, this.getRecoveryDisplayName(recovery), recovery);
      }
      throw error;
    }
  }

  /**
   * Synchroniser les mises journalières spéciales
   */
  public async syncSpecialDailyStakes(recoveries: Recovery[]): Promise<void> {
    const stakeUnits = [];
    const currentUser = this.authService.currentUser;
    console.log('SPECIAL STAKES SIZE: ', recoveries.length);
    for (const recovery of recoveries) {
      if (recovery.clientId && recovery.distributionId) {
        const clientServerId = await this.getServerIdForEntity(recovery.clientId, 'client');
        const distributionServerId = await this.getServerIdForEntity(recovery.distributionId, 'distribution');
        console.log('clientServerId', clientServerId);
        console.log('distributionServerId', distributionServerId);
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
          } else {
            console.error(`Skipping special stake for recovery ${recovery.id} due to invalid parent server ID. Client ID: ${clientServerId}, Distribution ID: ${distributionServerId}`);
            await this.logSyncError('recovery', recovery.id, 'SKIP', new Error('Parent entity (client or distribution) has not been synced correctly.'), recovery, this.getRecoveryDisplayName(recovery), recovery);
          }
        }
      }
    }

    const syncRequest: SpecialDailyStakeRequest = {
      collector: currentUser?.username || '',
      stakeUnits
    };

    const headers = this.getAuthHeaders();
    if (stakeUnits.length > 0) {
      try {
        const response = await this.http.post<ApiResponse<string[]>>(`${this.baseUrl}/api/v1/credits/special-daily-stake`, syncRequest, { headers }).toPromise();

        if (response?.data && Array.isArray(response.data)) {
          const syncedRecoveryIds = response.data;
          // Marquer tous les recouvrements retournés comme synchronisés
          for (const recoveryId of syncedRecoveryIds) {
            await this.markRecoveryAsSynced(recoveryId);
          }
        }
      } catch (error) {
        for (const recovery of recoveries) {
          await this.logSyncError('recovery', recovery.id, 'CREATE', error, syncRequest, this.getRecoveryDisplayName(recovery), recovery);
        }
        throw error;
      }
    } else {
      console.log('StakeUnits.length est inférieur à 1')
    }

  }

  // ==================== VÉRIFICATION DE SYNCHRONISATION ====================

  /**
   * Vérifie s'il y a des données locales non synchronisées.
   * @returns Promise<boolean>
   */
  async hasUnsyncedData(): Promise<boolean> {
    const checks = [
      this.databaseService.getUnsyncedLocalities(),
      this.getUnsyncedClients(),
      this.databaseService.getUpdatedClients(),
      this.databaseService.getUpdatedPhotoClients(),
      this.photoSyncService.getClientsWithUpdatedPhotoUrls(),
      this.getUnsyncedDistributions(),
      this.getUnsyncedOrders(),
      this.categorizeRecoveries().then(r => [...r.defaultStakes, ...r.specialStakes]),
      this.getUnsyncedAccounts(),
      this.getUpdatedAccounts(),
      this.getUnsyncedTontineMembers(),
      this.getUnsyncedTontineCollections(),
      this.getUnsyncedTontineDeliveries(),
    ];

    for (const check of checks) {
      try {
        const result = await check;
        if (result.length > 0) {
          console.log('Unsynced data found:', result);
          return true; // Données non synchronisées trouvées
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des données non synchronisées:', error);
        // En cas d'erreur, on considère qu'il peut y avoir des données à synchroniser par sécurité
        return true;
      }
    }

    return false; // Aucune donnée non synchronisée trouvée
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Obtenir les headers d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    const user = this.authService.currentUser;
    const token = user?.accessToken;
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError = (error: any): Observable<never> => {
    console.error('Erreur API:', error);
    return throwError(error);
  };

  /**
   * Générer un ID unique
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ==================== MÉTHODES À IMPLÉMENTER ====================
  // Ces méthodes seront implémentées dans les prochaines phases

  async getUnsyncedClients(): Promise<Client[]> {
    try {
      const user = this.authService.currentUser;
      if (!user) return [];

      const result = await this.databaseService.query(
        `
        SELECT * FROM clients WHERE isSync = 0 AND isLocal = 1 AND commercial = ?
      `,
        [user.username]
      );
      return result.values?.map((row: any) => this.mapRowToClient(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des clients non synchronisés:', error);
      return [];
    }
  }

  async getUnsyncedAccounts(): Promise<Account[]> {
    try {
      const user = this.authService.currentUser;
      if (!user) return [];

      const result = await this.databaseService.query(
        `
        SELECT a.* FROM accounts a
        JOIN clients c ON a.clientId = c.id
        WHERE a.isSync = 0 AND a.isLocal = 1 AND c.commercial = ?
      `,
        [user.username]
      );
      return result.values?.map((row: any) => this.mapRowToAccount(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des comptes non synchronisés:', error);
      return [];
    }
  }

  async getUpdatedAccounts(): Promise<Account[]> {
    try {
      const user = this.authService.currentUser;
      if (!user) return [];

      const result = await this.databaseService.query(
        `
        SELECT a.* FROM accounts a
        JOIN clients c ON a.clientId = c.id
        WHERE a.updated = 1 AND c.commercial = ?
      `,
        [user.username]
      );
      return result.values?.map((row: any) => this.mapRowToAccount(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des comptes mis à jour:', error);
      return [];
    }
  }

  async getUnsyncedDistributions(): Promise<Distribution[]> {
    try {
      const user = this.authService.currentUser;
      if (!user) return [];

      const result = await this.databaseService.query(
        `
        SELECT * FROM distributions WHERE isSync = 0 AND isLocal = 1 AND commercialId = ?
      `,
        [user.username]
      );
      return result.values?.map((row: any) => this.mapRowToDistribution(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des distributions non synchronisées:', error);
      return [];
    }
  }

  async getUnsyncedOrders(): Promise<Order[]> {
    try {
      const user = this.authService.currentUser;
      if (!user) return [];

      const result = await this.databaseService.query(
        `
        SELECT * FROM orders WHERE isSync = 0 AND isLocal = 1 AND commercialId = ?
      `,
        [user.username]
      );
      return result.values?.map((row: any) => this.mapRowToOrder(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes non synchronisées:', error);
      return [];
    }
  }


  async categorizeRecoveries(): Promise<{ defaultStakes: Recovery[], specialStakes: Recovery[] }> {
    try {
      const user = this.authService.currentUser;
      if (!user) return { defaultStakes: [], specialStakes: [] };

      const result = await this.databaseService.query(
        `
        SELECT * FROM recoveries WHERE isSync = 0 AND isLocal = 1 AND commercialId = ?
      `,
        [user.username]
      );
      console.log('RECOVERIES result: ', result);
      const recoveries = result.values?.map((row: any) => this.mapRowToRecovery(row)) || [];
      console.log('RECOVERIES MAP: ', recoveries);
      const defaultStakes = recoveries.filter((r: Recovery) => r.isDefaultStake);
      const specialStakes = recoveries.filter((r: Recovery) => !r.isDefaultStake);

      return { defaultStakes, specialStakes };
    } catch (error) {
      console.error('Erreur lors de la catégorisation des recouvrements:', error);
      return { defaultStakes: [], specialStakes: [] };
    }
  }

  private async prepareClientSyncRequest(client: Client): Promise<ClientSyncRequest> {
    let iddocBase64: string | undefined;
    let profilPhotoBase64: string | undefined;

    try {
      if (client.cardPhoto) {
        const file = await Filesystem.readFile({ path: client.cardPhoto, directory: Directory.ExternalStorage });
        iddocBase64 = file.data as string;
      }
      if (client.profilPhoto) {
        const file = await Filesystem.readFile({ path: client.profilPhoto, directory: Directory.ExternalStorage });
        profilPhotoBase64 = file.data as string;
      }
    } catch (error) {
      console.error('Error reading image file for client sync', error);
      // Laisser les variables undefined, elles ne seront pas incluses dans le JSON
    }

    const syncRequest: ClientSyncRequest = {
      address: client.address || '',
      cardID: client.cardID || '',
      cardType: client.cardType || '',
      collector: client.commercial || '',
      tontineCollector: client.commercial || '',
      agencyCollector: 'COM001',
      dateOfBirth: client.dateOfBirth || '',
      firstname: client.firstname || '',
      lastname: client.lastname || '',
      occupation: client.occupation || '',
      phone: client.phone || '',
      quarter: client.quarter || '',
      id: null,
      contactPersonName: client.contactPersonName || '',
      contactPersonPhone: client.contactPersonPhone || '',
      contactPersonAddress: client.contactPersonAddress || '',
      clientType: 'CLIENT',
      iddoc: iddocBase64,
      profilPhoto: profilPhotoBase64,
      longitude: client.longitude || 0,
      latitude: client.latitude || 0,
      mll: client.mll || '',
      code: client.code || '',
      profilPhotoUrl: client.profilPhotoUrl || '',
      cardPhotoUrl: client.cardPhotoUrl || ''
    };

    console.log('[SyncDebug] Preparing client sync request:', { ...syncRequest, profilPhoto: syncRequest.profilPhoto ? '[BASE64 DATA PRESENT]' : '[NO PHOTO]', iddoc: syncRequest.iddoc ? '[BASE64 DATA PRESENT]' : '[NO PHOTO]' });

    return syncRequest;
  }

  private prepareAccountSyncRequest(account: Account, serverClientId?: number): AccountSyncRequest {
    if (serverClientId === undefined) {
      throw new Error('serverClientId is undefined');
    }
    return {
      id: null,
      accountNumber: account.accountNumber || '',
      clientId: serverClientId,
      accountBalance: account.accountBalance || 0
    };
  }

  private async prepareDistributionSyncRequest(distribution: Distribution): Promise<DistributionSyncRequest> {
    // Récupérer les articles de la distribution
    const items = await this.getDistributionItems(distribution.id);
    const clientServerId = await this.getServerIdForEntity(distribution.clientId, 'client');
    console.log('distribution1', distribution);
    console.log('distribution2', distribution.creditId);
    console.log('distribution3', parseInt(distribution.creditId || '0'));


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
      reference: distribution.reference || distribution.id // Ajout de la référence
    };
  }

  private async prepareOrderSyncRequest(order: Order): Promise<OrderSyncRequest> {
    const items = await this.getOrderItems(order.id);
    const clientServerId = await this.getServerIdForEntity(order.clientId, 'client');

    if (!clientServerId) {
      throw new Error(`Impossible de trouver l\'ID serveur pour le client local ${order.clientId}`);
    }

    return {
      clientId: parseInt(clientServerId, 10),
      items: items.map(item => ({
        articleId: parseInt(item.articleId, 10),
        quantity: item.quantity
      }))
    };
  }

  private async storeIdMapping(localId: string, serverId: string, entityType: string): Promise<void> {
    try {
      console.log('adding idMappingCache: ', localId + ' : serverId : ' + serverId + ' : entityType : ' + entityType);
      await this.databaseService.execute(
        `
        INSERT OR REPLACE INTO id_mappings (localId, serverId, entityType, syncDate)
        VALUES (?, ?, ?, datetime('now'))
      `,
        [localId, serverId, entityType]
      );

      // Mettre en cache
      this.idMappingCache.set(`${entityType}:${localId}`, serverId);
      console.log('added idMappingCache: ', localId + ' : serverId : ' + serverId + ' : entityType : ' + entityType);
      console.log('get idMappingCache: ', this.idMappingCache.get(`${entityType}:${localId}`));
    } catch (error) {
      console.error('Erreur lors du stockage du mapping:', error);
    }
  }

  private async getServerIdForEntity(localId: string, entityType: string): Promise<string | null> {
    const cacheKey = `${entityType}:${localId}`;

    // Vérifier le cache
    if (this.idMappingCache.has(cacheKey)) {
      return this.idMappingCache.get(cacheKey) || localId;
    }

    try {
      const result = await this.databaseService.query(
        `
        SELECT serverId FROM id_mappings WHERE localId = ? AND entityType = ?
      `,
        [localId, entityType]
      );

      const serverId = result.values?.[0]?.[0] || localId;
      if (serverId) {
        this.idMappingCache.set(cacheKey, serverId);
      }

      return serverId;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'ID serveur:', error);
      return null;
    }
  }

  private async logSyncError(entityType: string, entityId: string, operation: string, error: any, requestData: any, displayName: string, entityDetails: any): Promise<void> {
    await this.syncErrorService.logSyncError(entityType, entityId, operation, error, requestData, displayName, entityDetails);
  }

  private async getRecentSyncErrors(): Promise<SyncError[]> {
    return await this.syncErrorService.getSyncErrors();
  }

  // Méthodes de marquage comme synchronisé
  private async markClientAsSynced(localId: string, serverId: string, syncedClientData: ClientSyncResponse): Promise<void> {
    // On ne fait rien si les IDs sont identiques
    if (!this.databaseService || localId === serverId) {
      return;
    }

    try {
      const valuesToSave = [serverId, syncedClientData.profilPhoto, syncedClientData.iddoc, localId];
      console.log('[SyncDebug] Preparing to mark client as synced. Values to save in local DB:', {
        newId: serverId,
        profilPhotoUrl: syncedClientData.profilPhoto,
        cardPhotoUrl: syncedClientData.iddoc,
        localId: localId
      });

      // On prépare un "set" de toutes les requêtes de mise à jour nécessaires.
      // 'executeSet' les exécutera toutes dans une seule transaction atomique.
      const updateSet: capSQLiteSet[] = [
        // Étape 1 : Mettre à jour toutes les tables "enfant" qui référencent l'ancien ID
        {
          statement: `UPDATE accounts SET clientId = ? WHERE clientId = ?`,
          values: [serverId, localId]
        },
        {
          statement: `UPDATE distributions SET clientId = ? WHERE clientId = ?`,
          values: [serverId, localId]
        },
        {
          statement: `UPDATE recoveries SET clientId = ? WHERE clientId = ?`,
          values: [serverId, localId]
        },
        {
          statement: `UPDATE transactions SET clientId = ? WHERE clientId = ?`,
          values: [serverId, localId]
        },
        {
          statement: `UPDATE orders SET clientId = ? WHERE clientId = ?`,
          values: [serverId, localId]
        },
        {
          statement: `UPDATE tontine_members SET clientId = ? WHERE clientId = ?`,
          values: [serverId, localId]
        },
        // ... Ajoutez ici toute autre table qui a une FOREIGN KEY vers clients.id

        // Étape 2 : Une fois que tous les enfants ont le nouvel ID, on peut mettre à jour le parent.
        {
          statement: `UPDATE clients SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime'), profilPhotoUrl = ?, cardPhotoUrl = ? WHERE id = ?`,
          values: valuesToSave
        }
      ];

      // On exécute l'ensemble des opérations. Si l'une échoue, tout est annulé.
      await this.databaseService.executeSet(updateSet);

      console.log(`Client ${localId} successfully synced and updated to new ID ${serverId}.`);

    } catch (error) {
      console.error(`Erreur lors du marquage du client ${localId} comme synchronisé:`, error);
      // On relance l'erreur pour que le service de synchronisation sache que l'opération a échoué
      throw error;
    }
  }

  private async markAccountAsSynced(localId: string, serverId: string): Promise<void> {
    try {
      await this.databaseService.execute(
        `
        UPDATE accounts SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now') WHERE id = ?
      `,
        [serverId, localId]
      );
    } catch (error) {
      console.error('Erreur lors du marquage du compte comme synchronisé:', error);
    }
  }

  private async markDistributionAsSynced(localId: string, serverId: string): Promise<void> {
    // On ne fait rien si les IDs sont déjà identiques ou si la connexion est absente
    if (!this.databaseService || localId === serverId) {
      return;
    }

    try {
      // On prépare un "set" de requêtes qui seront exécutées dans une seule transaction.
      // C'est la garantie que soit tout réussit, soit tout est annulé.
      const updateSet: capSQLiteSet[] = [
        // Étape 1 : Mettre à jour la table "enfant" (recoveries) en premier.
        // On lui indique le nouvel ID de son parent.
        {
          statement: `UPDATE recoveries SET distributionId = ? WHERE distributionId = ?`,
          values: [serverId, localId]
        },

        // Étape 2 : Maintenant que les enfants sont à jour, on peut modifier le parent.
        {
          statement: `UPDATE distributions SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`,
          values: [serverId, localId]
        }
      ];

      // On exécute l'ensemble des opérations de manière atomique.
      await this.databaseService.executeSet(updateSet);

      console.log(`Distribution ${localId} successfully synced and updated to new ID ${serverId}.`);

    } catch (error) {
      console.error(`Erreur lors du marquage de la distribution ${localId} comme synchronisée:`, error);
      // Il est important de relancer l'erreur pour que le processus de synchronisation sache qu'il y a eu un échec.
      throw error;
    }
  }

  private async markOrderAsSynced(localId: string, serverId: string): Promise<void> {
    if (!this.databaseService || localId === serverId) {
      return;
    }

    try {
      const updateSet: capSQLiteSet[] = [
        {
          statement: `UPDATE order_items SET orderId = ? WHERE orderId = ?`,
          values: [serverId, localId]
        },
        {
          statement: `UPDATE orders SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`,
          values: [serverId, localId]
        }
      ];

      await this.databaseService.executeSet(updateSet);

      console.log(`Order ${localId} successfully synced and updated to new ID ${serverId}.`);

    } catch (error) {
      console.error(`Erreur lors du marquage de la commande ${localId} comme synchronisée:`, error);
      throw error;
    }
  }


  private async markRecoveryAsSynced(localId: string): Promise<void> {
    try {
      await this.databaseService.execute(
        `
        UPDATE recoveries SET isSync = 1, isLocal = 0, syncDate = datetime('now') WHERE id = ?
      `,
        [localId]
      );
    } catch (error) {
      console.error('Erreur lors du marquage du recouvrement comme synchronisé:', error);
    }
  }

  // Méthodes de mise à jour des références
  private async updateClientReferences(localId: string, serverId: string): Promise<void> {
    try {
      await this.databaseService.execute(
        `
        UPDATE distributions SET clientId = ? WHERE clientId = ? AND isSync = 0
      `,
        [serverId, localId]
      );

      await this.databaseService.execute(
        `
        UPDATE recoveries SET clientId = ? WHERE clientId = ? AND isSync = 0
      `,
        [serverId, localId]
      );

      await this.databaseService.execute(
        `
        UPDATE accounts SET clientId = ? WHERE clientId = ? AND isSync = 0
      `,
        [serverId, localId]
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour des références client:', error);
    }
  }

  private async updateDistributionReferences(localId: string, serverId: string): Promise<void> {
    try {
      await this.databaseService.execute(
        `
        UPDATE recoveries SET distributionId = ? WHERE distributionId = ? AND isSync = 0
      `,
        [serverId, localId]
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour des références distribution:', error);
    }
  }

  // Méthodes d'accès aux données
  private async getClientAccount(clientId: string): Promise<Account | null> {
    try {
      const result = await this.databaseService.query(
        `
        SELECT * FROM accounts WHERE clientId = ? LIMIT 1
      `,
        [clientId]
      );

      return result.values?.[0] ? this.mapRowToAccount(result.values[0]) : null;
    } catch (error) {
      console.error('Erreur lors de la récupération du compte client:', error);
      return null;
    }
  }

  // Méthodes utilitaires de mapping
  private mapRowToClient(row: any): Client {
    return {
      id: row.id,
      firstname: row.firstname,
      lastname: row.lastname,
      phone: row.phone,
      address: row.address,
      dateOfBirth: row.dateOfBirth,
      occupation: row.occupation,
      clientType: row.clientType,
      cardType: row.cardType,
      cardID: row.cardID,
      quarter: row.quarter,
      latitude: row.latitude,
      longitude: row.longitude,
      mll: row.mll,
      profilPhoto: row.profilPhoto,
      contactPersonName: row.contactPersonName,
      contactPersonPhone: row.contactPersonPhone,
      contactPersonAddress: row.contactPersonAddress,
      commercial: row.commercial,
      isLocal: row.isLocal === 1,
      isSync: row.isSync === 1,
      syncDate: row.syncDate,
      createdAt: row.createdAt,
      code: row.code,
      profilPhotoUrl: row.profilPhotoUrl,
      cardPhotoUrl: row.cardPhotoUrl
    };
  }

  private mapRowToDistribution(row: any): Distribution {
    return {
      id: row.id,
      reference: row.reference,
      creditId: row.creditId,
      totalAmount: row.totalAmount,
      dailyPayment: row.dailyPayment,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      clientId: row.clientId,
      commercialId: row.commercialId,
      isLocal: row.isLocal === 1,
      isSync: row.isSync === 1,
      syncDate: row.syncDate,
      createdAt: row.createdAt,
      paidAmount: row.paidAmount,
      remainingAmount: row.remainingAmount,
      advance: row.advance
    } as Distribution;
  }

  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      reference: row.reference,
      totalAmount: row.totalAmount,
      advance: row.advance,
      remainingAmount: row.remainingAmount,
      dailyPayment: row.dailyPayment,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      clientId: row.clientId,
      commercialId: row.commercialId,
      isLocal: row.isLocal === 1,
      isSync: row.isSync === 1,
      syncDate: row.syncDate,
      createdAt: row.createdAt,
      articleCount: row.articleCount,
      items: [], // Les items sont chargés séparément
    } as Order;
  }

  private mapRowToRecovery(row: any): Recovery {
    return {
      id: row.id,
      amount: row.amount,
      paymentDate: row.paymentDate,
      paymentMethod: row.paymentMethod,
      notes: row.notes,
      distributionId: row.distributionId,
      clientId: row.clientId,
      commercialId: row.commercialId,
      isLocal: row.isLocal === 1,
      isSync: row.isSync === 1,
      syncDate: row.syncDate,
      createdAt: row.createdAt,
      isDefaultStake: row.isDefaultStake === 1
    } as Recovery;
  }

  private mapRowToAccount(row: any): Account {
    return {
      id: row.id,
      accountNumber: row.accountNumber,
      accountBalance: row.accountBalance,
      old_balance: row.old_balance,
      updated: row.updated === 1,
      status: row.status,
      clientId: row.clientId,
      isLocal: row.isLocal === 1,
      isSync: row.isSync === 1,
      createdAt: row.createdAt,
      syncDate: row.syncDate
    } as Account;
  }

  private generateClientCode(client: Client): string {
    // Format: 2 derniers caractères du username + nombre total + 1 sur 3 digits
    const commercial = client.commercial || '';
    const suffix = commercial.slice(-2);
    // Pour l'instant, utiliser un nombre aléatoire
    const number = Math.floor(Math.random() * 999) + 1;
    return `${suffix}${number.toString().padStart(3, '0')}`;
  }

  private async getDistributionItems(distributionId: string): Promise<any[]> {
    try {
      const result = await this.databaseService.query(
        `
        SELECT * FROM distribution_items WHERE distributionId = ?
      `,
        [distributionId]
      );

      return result.values?.map((row: any) => ({
        id: row.id,
        distributionId: row.distributionId,
        articleId: row.articleId,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        totalPrice: row.totalPrice
      })) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des items de distribution:', error);
      return [];
    }
  }

  private async getOrderItems(orderId: string): Promise<OrderItem[]> {
    try {
      const result = await this.databaseService.query(
        `
        SELECT * FROM order_items WHERE orderId = ?
      `,
        [orderId]
      );

      return result.values?.map((row: any) => ({
        id: row.id,
        orderId: row.orderId,
        articleId: row.articleId,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        totalPrice: row.totalPrice
      })) || [];
    } catch (error) {
      console.error(`Erreur lors de la récupération des items pour la commande ${orderId}:`, error);
      return [];
    }
  }

  // Méthodes de génération de noms d'affichage
  public getClientDisplayName(client: Client): string {
    return `${client.firstname} ${client.lastname}`;
  }

  public getDistributionDisplayName(distribution: Distribution): string {
    return `Distribution ${distribution.reference || distribution.id}`;
  }

  public getOrderDisplayName(order: Order): string {
    return `Commande ${order.reference || order.id}`;
  }

  public getRecoveryDisplayName(recovery: Recovery): string {
    return `Recouvrement ${recovery.amount} FCFA`;
  }

  // ==================== TONTINE DATA RETRIEVAL ====================

  async getUnsyncedTontineMembers(): Promise<TontineMember[]> {
    try {
      const user = this.authService.currentUser;
      if (!user) return [];

      const sql = `
        SELECT tm.*,
        COALESCE(c.fullName, (COALESCE(c.firstname, '') || ' ' || COALESCE(c.lastname, ''))) as clientName
        FROM tontine_members tm
        LEFT JOIN clients c ON tm.clientId = c.id
        WHERE tm.isSync = 0 AND tm.isLocal = 1 AND tm.commercialUsername = ?
      `;

      const result = await this.databaseService.query(sql, [user.username]);
      return result.values?.map((row: any) => this.mapRowToTontineMember(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des membres de tontine non synchronisés:', error);
      return [];
    }
  }

  async getModifiedTontineMembers(): Promise<TontineMember[]> {
    try {
      const user = this.authService.currentUser;
      if (!user) return [];

      const result = await this.databaseService.query(
        `SELECT * FROM tontine_members WHERE isSync = 0 AND isLocal = 0 AND commercialUsername = ?`,
        [user.username]
      );
      return result.values?.map((row: any) => this.mapRowToTontineMember(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des membres de tontine modifiés:', error);
      return [];
    }
  }

  async getUnsyncedTontineCollections(): Promise<TontineCollection[]> {
    try {
      const user = this.authService.currentUser;
      if (!user) return [];

      const sql = `
        SELECT tc.*,
        COALESCE(c.fullName, (COALESCE(c.firstname, '') || ' ' || COALESCE(c.lastname, ''))) as clientName,
        tm.id as _debug_tmId,
        c.id as _debug_clientId
        FROM tontine_collections tc
        LEFT JOIN tontine_members tm ON tc.tontineMemberId = tm.id
        LEFT JOIN clients c ON tm.clientId = c.id
        WHERE tc.isSync = 0 AND tc.isLocal = 1 AND tc.commercialUsername = ?
      `;

      const result = await this.databaseService.query(sql, [user.username]);
      console.log('[SynchronizationService] getUnsyncedTontineCollections result:', JSON.stringify(result.values, null, 2));
      return result.values?.map((row: any) => this.mapRowToTontineCollection(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des collectes de tontine non synchronisées:', error);
      return [];
    }
  }

  async getUnsyncedTontineDeliveries(): Promise<TontineDelivery[]> {
    try {
      const user = this.authService.currentUser;
      if (!user) return [];

      const sql = `
        SELECT td.*,
        COALESCE(c.fullName, (COALESCE(c.firstname, '') || ' ' || COALESCE(c.lastname, ''))) as clientName
        FROM tontine_deliveries td
        LEFT JOIN tontine_members tm ON td.tontineMemberId = tm.id
        LEFT JOIN clients c ON tm.clientId = c.id
        WHERE td.isSync = 0 AND td.isLocal = 1 AND td.commercialUsername = ?
      `;

      const result = await this.databaseService.query(sql, [user.username]);
      return result.values?.map((row: any) => this.mapRowToTontineDelivery(row)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des livraisons de tontine non synchronisées:', error);
      return [];
    }
  }

  private async getTontineDeliveryItems(deliveryId: string): Promise<any[]> {
    try {
      const result = await this.databaseService.query(
        `SELECT * FROM tontine_delivery_items WHERE tontineDeliveryId = ?`,
        [deliveryId]
      );
      return result.values?.map((row: any) => ({
        id: row.id,
        tontineDeliveryId: row.tontineDeliveryId,
        articleId: row.articleId,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        totalPrice: row.totalPrice
      })) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des items de livraison de tontine:', error);
      return [];
    }
  }

  // ==================== TONTINE MAPPING METHODS ====================

  private mapRowToTontineMember(row: any): TontineMember {
    return {
      id: row.id,
      tontineSessionId: row.tontineSessionId,
      clientId: row.clientId,
      commercialUsername: row.commercialUsername,
      totalContribution: row.totalContribution || 0,
      deliveryStatus: row.deliveryStatus,
      registrationDate: row.registrationDate,
      isLocal: row.isLocal === 1,
      isSync: row.isSync === 1,
      syncDate: row.syncDate,
      syncHash: row.syncHash,
      frequency: row.frequency,
      amount: row.amount,
      notes: row.notes,
      clientName: row.clientName
    } as TontineMember;
  }

  private mapRowToTontineCollection(row: any): TontineCollection {
    return {
      id: row.id,
      tontineMemberId: row.tontineMemberId,
      amount: row.amount,
      collectionDate: row.collectionDate,
      isLocal: row.isLocal === 1,
      isSync: row.isSync === 1,
      syncDate: row.syncDate,
      syncHash: row.syncHash,
      isDeliveryCollection: row.isDeliveryCollection === 1,
      clientName: row.clientName
    } as TontineCollection;
  }

  private mapRowToTontineDelivery(row: any): TontineDelivery {
    return {
      id: row.id,
      tontineMemberId: row.tontineMemberId,
      commercialUsername: row.commercialUsername,
      requestDate: row.requestDate,
      deliveryDate: row.deliveryDate,
      totalAmount: row.totalAmount,
      status: row.status,
      isLocal: row.isLocal === 1,
      isSync: row.isSync === 1,
      syncDate: row.syncDate,
      syncHash: row.syncHash,
      clientName: row.clientName
    } as TontineDelivery;
  }

  // ==================== TONTINE DISPLAY NAME METHODS ====================

  public getTontineMemberDisplayName(member: TontineMember): string {
    return `Membre Tontine ${member.id}`;
  }

  public getTontineCollectionDisplayName(collection: TontineCollection): string {
    return `Collecte Tontine ${collection.id}`;
  }

  public getTontineDeliveryDisplayName(delivery: TontineDelivery): string {
    return `Livraison Tontine ${delivery.id}`;
  }

  // ==================== TONTINE REQUEST PREPARATION METHODS ====================

  private async prepareTontineMemberSyncRequest(member: TontineMember): Promise<TontineMemberSyncRequest> {
    const clientServerId = await this.getServerIdForEntity(member.clientId, 'client');
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

  private prepareTontineCollectionSyncRequest(collection: TontineCollection, serverMemberId: number): TontineCollectionSyncRequest {
    return {
      memberId: serverMemberId,
      amount: collection.amount,
      isDeliveryCollection: collection.isDeliveryCollection,
      reference: collection.id // Utiliser l'ID local comme référence
    };
  }

  private async prepareTontineDeliverySyncRequest(delivery: TontineDelivery): Promise<TontineDeliverySyncRequest> {
    const items = await this.getTontineDeliveryItems(delivery.id);
    const serverMemberId = await this.getServerIdForEntity(delivery.tontineMemberId, 'tontine-member');
    if (!serverMemberId) {
      throw new Error(`Impossible de trouver l'ID serveur pour le membre de tontine local ${delivery.tontineMemberId}`);
    }
    return {
      tontineMemberId: parseInt(serverMemberId, 10),
      requestDate: delivery.requestDate,
      items: items.map(item => ({
        articleId: parseInt(item.articleId, 10),
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };
  }

  // ==================== TONTINE MARKING METHODS ====================

  private async markTontineMemberAsSynced(localId: string, serverId: string): Promise<void> {
    if (!this.databaseService || localId === serverId) {
      return;
    }
    try {
      // IMPORTANT:
      // Mettre à jour d'abord les tables enfants qui référencent le membre,
      // puis seulement ensuite mettre à jour le membre lui‑même.
      // Sinon, la modification de la PK du membre ferait échouer la contrainte
      // de clé étrangère des tables enfants qui pointent encore sur l'ancien ID.
      const updateSet: capSQLiteSet[] = [
        {
          statement: `UPDATE tontine_collections SET tontineMemberId = ? WHERE tontineMemberId = ?`,
          values: [serverId, localId]
        },
        {
          statement: `UPDATE tontine_deliveries SET tontineMemberId = ? WHERE tontineMemberId = ?`,
          values: [serverId, localId]
        },
        {
          statement: `UPDATE tontine_members SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`,
          values: [serverId, localId]
        }
      ];
      await this.databaseService.executeSet(updateSet);
      console.log(`Tontine member ${localId} successfully synced and updated to new ID ${serverId}.`);
    } catch (error) {
      console.error(`Erreur lors du marquage du membre de tontine ${localId} comme synchronisé:`, error);
      throw error;
    }
  }

  private async markTontineCollectionAsSynced(localId: string, serverId: string): Promise<void> {
    if (!this.databaseService || localId === serverId) {
      return;
    }
    try {
      await this.databaseService.execute(
        `UPDATE tontine_collections SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`,
        [serverId, localId]
      );
      console.log(`Tontine collection ${localId} successfully synced and updated to new ID ${serverId}.`);
    } catch (error) {
      console.error(`Erreur lors du marquage de la collecte de tontine ${localId} comme synchronisée:`, error);
      throw error;
    }
  }

  private async markTontineDeliveryAsSynced(localId: string, serverId: string): Promise<void> {
    if (!this.databaseService || localId === serverId) {
      return;
    }
    try {
      // IMPORTANT:
      // Mettre à jour d'abord les items (enfants) qui référencent la livraison,
      // puis ensuite la livraison elle‑même. Sinon, changer la PK de la livraison
      // avant les enfants peut déclencher une erreur de contrainte FOREIGN KEY.
      const updateSet: capSQLiteSet[] = [
        {
          statement: `UPDATE tontine_delivery_items SET tontineDeliveryId = ? WHERE tontineDeliveryId = ?`,
          values: [serverId, localId]
        },
        {
          statement: `UPDATE tontine_deliveries SET isSync = 1, isLocal = 0, id = ?, syncDate = datetime('now', 'localtime') WHERE id = ?`,
          values: [serverId, localId]
        }
      ];
      await this.databaseService.executeSet(updateSet);
      console.log(`Tontine delivery ${localId} successfully synced and updated to new ID ${serverId}.`);
    } catch (error) {
      console.error(`Erreur lors du marquage de la livraison de tontine ${localId} comme synchronisée:`, error);
      throw error;
    }
  }

  private async markTontineMemberAsUpdated(localId: string): Promise<void> {
    if (!this.databaseService) {
      return;
    }
    try {
      await this.databaseService.execute(
        `UPDATE tontine_members SET isSync = 1, syncDate = datetime('now', 'localtime') WHERE id = ?`,
        [localId]
      );
      console.log(`Tontine member ${localId} marked as updated/synced.`);
    } catch (error) {
      console.error(`Erreur lors du marquage du membre de tontine ${localId} comme mis à jour:`, error);
      throw error;
    }
  }

  // ==================== TONTINE SYNC SINGLE ENTITY METHODS ====================

  async syncSingleTontineMember(member: TontineMember): Promise<TontineMemberSyncResponse> {
    const syncRequest = await this.prepareTontineMemberSyncRequest(member);
    const headers = this.getAuthHeaders();
    return firstValueFrom(
      this.http.post<ApiResponse<TontineMemberSyncResponse>>(`${this.baseUrl}/api/v1/tontines/members`, syncRequest, { headers })
        .pipe(
          switchMap(async (response) => {
            if (!response || !response.data) {
              const errorMessage = response?.message || 'La synchronisation du membre de tontine a renvoyé une réponse vide ou invalide.';
              throw new Error(errorMessage);
            }
            const syncedMember = response.data;
            await this.storeIdMapping(member.id, syncedMember.id.toString(), 'tontine-member');
            await this.markTontineMemberAsSynced(member.id, syncedMember.id.toString());
            return syncedMember;
          }),
          catchError(this.handleError)
        )
    );
  }

  async syncSingleTontineCollection(collection: TontineCollection): Promise<TontineCollectionSyncResponse> {
    const serverMemberId = await this.getServerIdForEntity(collection.tontineMemberId, 'tontine-member');
    if (!serverMemberId) {
      throw new Error(`Impossible de trouver l'ID serveur pour le membre de tontine local ${collection.tontineMemberId}`);
    }
    const syncRequest = this.prepareTontineCollectionSyncRequest(collection, parseInt(serverMemberId, 10));
    const headers = this.getAuthHeaders();
    return firstValueFrom(
      this.http.post<ApiResponse<TontineCollectionSyncResponse>>(`${this.baseUrl}/api/v1/tontines/collections`, syncRequest, { headers })
        .pipe(
          switchMap(async (response) => {
            if (!response || !response.data) {
              const errorMessage = response?.message || 'La synchronisation de la collecte de tontine a renvoyé une réponse vide ou invalide.';
              throw new Error(errorMessage);
            }
            const syncedCollection = response.data;
            await this.storeIdMapping(collection.id, syncedCollection.id.toString(), 'tontine-collection');
            await this.markTontineCollectionAsSynced(collection.id, syncedCollection.id.toString());
            return syncedCollection;
          }),
          catchError(this.handleError)
        )
    );
  }

  async syncSingleTontineDelivery(delivery: TontineDelivery): Promise<TontineDeliverySyncResponse> {
    const syncRequest = await this.prepareTontineDeliverySyncRequest(delivery);
    const headers = this.getAuthHeaders();
    return firstValueFrom(
      this.http.post<ApiResponse<TontineDeliverySyncResponse>>(`${this.baseUrl}/api/v1/tontines/deliveries/distribute`, syncRequest, { headers })
        .pipe(
          switchMap(async (response) => {
            if (!response || !response.data) {
              const errorMessage = response?.message || 'La synchronisation de la livraison de tontine a renvoyé une réponse vide ou invalide.';
              throw new Error(errorMessage);
            }
            const syncedDelivery = response.data;
            await this.storeIdMapping(delivery.id, syncedDelivery.id.toString(), 'tontine-delivery');
            await this.markTontineDeliveryAsSynced(delivery.id, syncedDelivery.id.toString());
            return syncedDelivery;
          }),
          catchError(this.handleError)
        )
    );
  }

  // ==================== TONTINE SYNC ALL METHODS ====================

  async updateSingleTontineMember(member: TontineMember): Promise<TontineMemberSyncResponse> {
    const syncRequest = await this.prepareTontineMemberSyncRequest(member);
    const headers = this.getAuthHeaders();
    return firstValueFrom(
      this.http.put<ApiResponse<TontineMemberSyncResponse>>(`${this.baseUrl}/api/v1/tontines/members/${member.id}`, syncRequest, { headers })
        .pipe(
          switchMap(async (response) => {
            if (!response || !response.data) {
              const errorMessage = response?.message || 'La mise à jour du membre de tontine a renvoyé une réponse vide ou invalide.';
              throw new Error(errorMessage);
            }
            const syncedMember = response.data;
            await this.markTontineMemberAsUpdated(member.id);
            return syncedMember;
          }),
          catchError(this.handleError)
        )
    );
  }

  private async syncModifiedTontineMembers(result: SyncBatchResult, modifiedMembers: TontineMember[], processedItems: number, totalItems: number): Promise<number> {
    for (const member of modifiedMembers) {
      try {
        await this.updateSingleTontineMember(member);
        // We reuse the same counter for success
        result.tontineMembersSync.success++;
      } catch (error) {
        result.tontineMembersSync.errors++;
        await this.logSyncError('tontine-member', member.id, 'UPDATE', error, member, this.getTontineMemberDisplayName(member), member);
      }
      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }

  private async syncAllTontineMembers(result: SyncBatchResult, unsyncedMembers: TontineMember[], processedItems: number, totalItems: number): Promise<number> {
    for (const member of unsyncedMembers) {
      if (this.failedClientIds.includes(member.clientId)) {
        result.tontineMembersSync.errors++;
        const error = new Error(`Synchronisation ignorée car le client parent (ID: ${member.clientId}) a échoué.`);
        await this.logSyncError('tontine-member', member.id, 'SKIP', error, member, this.getTontineMemberDisplayName(member), member);
        // Marquer aussi ce membre comme "failed" pour que ses collectes et livraisons
        // soient automatiquement ignorées dans les phases suivantes.
        this.failedTontineMemberIds.push(member.id);
        processedItems++;
        this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
        continue;
      }
      try {
        await this.syncSingleTontineMember(member);
        result.tontineMembersSync.success++;
      } catch (error) {
        result.tontineMembersSync.errors++;
        this.failedTontineMemberIds.push(member.id);
        await this.logSyncError('tontine-member', member.id, 'CREATE', error, member, this.getTontineMemberDisplayName(member), member);
      }
      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }

  private async syncAllTontineCollections(result: SyncBatchResult, unsyncedCollections: TontineCollection[], processedItems: number, totalItems: number): Promise<number> {
    for (const collection of unsyncedCollections) {
      if (this.failedTontineMemberIds.includes(collection.tontineMemberId)) {
        result.tontineCollectionsSync.errors++;
        const error = new Error(`Synchronisation ignorée car le membre parent (ID: ${collection.tontineMemberId}) a échoué.`);
        await this.logSyncError('tontine-collection', collection.id, 'SKIP', error, collection, this.getTontineCollectionDisplayName(collection), collection);
        processedItems++;
        this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
        continue;
      }
      try {
        await this.syncSingleTontineCollection(collection);
        result.tontineCollectionsSync.success++;
      } catch (error) {
        result.tontineCollectionsSync.errors++;
        this.failedTontineCollectionIds.push(collection.id);
        await this.logSyncError('tontine-collection', collection.id, 'CREATE', error, collection, this.getTontineCollectionDisplayName(collection), collection);
      }
      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }

  private async syncAllTontineDeliveries(result: SyncBatchResult, unsyncedDeliveries: TontineDelivery[], processedItems: number, totalItems: number): Promise<number> {
    for (const delivery of unsyncedDeliveries) {
      if (this.failedTontineMemberIds.includes(delivery.tontineMemberId)) {
        result.tontineDeliveriesSync.errors++;
        const error = new Error(`Synchronisation ignorée car le membre parent (ID: ${delivery.tontineMemberId}) a échoué.`);
        await this.logSyncError('tontine-delivery', delivery.id, 'SKIP', error, delivery, this.getTontineDeliveryDisplayName(delivery), delivery);
        processedItems++;
        this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
        continue;
      }
      try {
        await this.syncSingleTontineDelivery(delivery);
        result.tontineDeliveriesSync.success++;
      } catch (error) {
        result.tontineDeliveriesSync.errors++;
        await this.logSyncError('tontine-delivery', delivery.id, 'CREATE', error, delivery, this.getTontineDeliveryDisplayName(delivery), delivery);
      }
      processedItems++;
      this.store.dispatch(updateSyncProgress({ progress: { processedItems, percentage: (processedItems / totalItems) * 100 } }));
    }
    return processedItems;
  }
}
