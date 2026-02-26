import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, concatMap, BehaviorSubject } from 'rxjs';
import {switchMap, catchError, map} from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { Client } from '../../models/client.model';
import { Account } from '../../models/account.model';
import { ApiResponse } from '../../models/api-response.model';
import { HealthCheckService } from './health-check.service';
import { LoggerService } from './logger.service';
import { PhotoSyncService } from './photo-sync.service';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { ClientRepositoryFilters, ClientRepositoryExtensions } from '../repositories/client.repository.extensions';
import { buildDateFilterClause } from '../models/date-filter.model';
import { ClientRepository } from '../repositories/client.repository';
import { AccountRepository } from '../repositories/account.repository';

export interface ClientInitializationProgress {
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  loadedClients: number;
  totalClients: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CLIENTS = 5000;
  private readonly PAGE_SIZE = 20;

  private clientsCache: { data: Client[]; timestamp: number; commercialUsername: string } | null = null;
  private initializationProgress$ = new BehaviorSubject<ClientInitializationProgress>({
    isLoading: false,
    currentPage: 0,
    totalPages: 0,
    loadedClients: 0,
    totalClients: 0,
    message: 'Prêt'
  });
  private commercialUsername: string | undefined; // Add this property

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private healthCheckService: HealthCheckService,
    private log: LoggerService,
    private photoSyncService: PhotoSyncService,
    private store: Store, // Inject Store
    private clientRepository: ClientRepository,
    private clientRepositoryExtensions: ClientRepositoryExtensions,
    private accountRepository: AccountRepository
  ) {
    this.store.select(selectAuthUser).subscribe(user => {
      this.commercialUsername = user?.username;
    });
  }

  // Observable pour suivre le progrès d'initialisation
  getInitializationProgress(): Observable<ClientInitializationProgress> {
    return this.initializationProgress$.asObservable();
  }

  initializeClients(commercialUsername: string, forceRefresh: boolean = false): Observable<Client[]> {
    // Vérifier le cache si pas de rafraîchissement forcé
    if (!forceRefresh && this.isCacheValid(commercialUsername)) {
      this.log.log('[ClientService] Returning cached clients');
      this.updateProgress({
        isLoading: false,
        currentPage: 0,
        totalPages: 1,
        loadedClients: this.clientsCache!.data.length,
        totalClients: this.clientsCache!.data.length,
        message: 'Clients chargés depuis le cache'
      });
      return of(this.clientsCache!.data);
    }

    this.updateProgress({
      isLoading: true,
      currentPage: 0,
      totalPages: 0,
      loadedClients: 0,
      totalClients: 0,
      message: 'Vérification de la connexion...'
    });

    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          this.updateProgress({
            isLoading: true,
            currentPage: 0,
            totalPages: 0,
            loadedClients: 0,
            totalClients: 0,
            message: 'Récupération des clients depuis l\'API...'
          });

          return this.fetchClientsFromApi(commercialUsername).pipe(
            concatMap(async (clients) => {
              // Note: clients here will be empty or partial because fetchClientsFromApi now handles saving internally
              // and we don't want to return all clients to avoid memory issues.

              this.updateProgress({
                isLoading: true,
                currentPage: 0,
                totalPages: 0,
                loadedClients: 0, // We don't know total loaded here easily without tracking
                totalClients: 0,
                message: 'Synchronisation des photos en cours...'
              });

              // Synchroniser les photos après l'initialisation des clients
              // WARNING: This might still be heavy if it tries to sync all photos at once.
              // Ideally PhotoSyncService should also be paginated or incremental.
              try {
                // Utiliser la nouvelle méthode de synchronisation par batch
                // We pass an empty array or handle it differently because we don't have all clients in memory anymore.
                // If photoSyncService needs the list of clients, we might need to change how it works.
                // For now, assuming it can work or we skip it here and let it run in background.
                // await this.photoSyncService.syncPhotosForClients(clients);
                // this.log.log('[ClientService] Photo synchronization completed');

                // Alternative: Trigger photo sync for local clients that need it, or just rely on background sync.
                 this.log.log('[ClientService] Photo synchronization skipped in initializeClients to save memory. Should be handled by background sync.');

              } catch (error) {
                this.log.log(`[ClientService] Photo synchronization failed: ${error}`);
              }

              this.updateProgress({
                isLoading: false,
                currentPage: 0,
                totalPages: 0,
                loadedClients: 0,
                totalClients: 0,
                message: `Synchronisation terminée`
              });

              return []; // Return empty array to indicate success but no data payload
            }),
            catchError(async (error) => {
              this.log.log(`[ClientService] API fetch failed: ${error.message}`);
              this.updateProgress({
                isLoading: false,
                currentPage: 0,
                totalPages: 0,
                loadedClients: 0,
                totalClients: 0,
                message: `Mode hors ligne activé`
              });

              return [];
            })
          );
        } else {
          this.updateProgress({
            isLoading: false,
            currentPage: 0,
            totalPages: 0,
            loadedClients: 0,
            totalClients: 0,
            message: 'Mode hors ligne'
          });

          return of([]);
        }
      }),
      catchError(error => {
        this.updateProgress({
          isLoading: false,
          currentPage: 0,
          totalPages: 0,
          loadedClients: 0,
          totalClients: 0,
          message: 'Erreur lors du chargement des clients'
        });
        this.log.log(`[ClientService] initializeClients error: ${error.message}`);
        return of([]);
      })
    );
  }

  private fetchClientsFromApi(commercialUsername: string): Observable<Client[]> {
    // We start the pagination process. We don't accumulate clients anymore.
    return this.fetchPageAndSave(commercialUsername, 0, this.PAGE_SIZE);
  }

  private fetchPageAndSave(commercialUsername: string, page: number, size: number): Observable<Client[]> {
      const url = `${environment.apiUrl}/api/v1/clients/by-commercial/${commercialUsername}?page=${page}&size=${size}&sort=id,desc`;

      return this.http.get<ApiResponse<{ content: Client[]; page: { totalPages: number; number: number; totalElements: number } }>>(url).pipe(
          switchMap(async (response) => {
              const clients = response.data.content;
              const pageInfo = response.data.page;

              if (clients.length > 0) {
                  // Save this batch of clients
                  await this.clientRepository.saveAll(clients);

                  // Also trigger photo sync for this batch if needed, but be careful not to block
                  // this.photoSyncService.syncPhotosForClients(clients).catch(e => console.error(e));
              }

              this.updateProgress({
                  isLoading: true,
                  currentPage: page + 1,
                  totalPages: pageInfo.totalPages,
                  loadedClients: (page * size) + clients.length,
                  totalClients: pageInfo.totalElements,
                  message: `Chargement page ${page + 1}/${pageInfo.totalPages}...`
              });

              this.log.log(`[ClientService] Processed page ${page + 1}/${pageInfo.totalPages}, saved ${clients.length} clients.`);

              // If there are more pages, fetch the next one
              if (page < pageInfo.totalPages - 1) {
                  // Recursive call, but we wrap it in from() because it returns an Observable
                  // We wait for the next page to complete
                  return await this.fetchPageAndSave(commercialUsername, page + 1, size).toPromise() || [];
              } else {
                  return []; // Done
              }
          }),
          catchError(error => {
              this.log.log(`[ClientService] Error fetching page ${page}: ${error.message}`);
              // Stop pagination on error
              return of([]);
          })
      );
  }

  // Méthodes utilitaires pour la gestion du cache
  private isCacheValid(commercialUsername: string): boolean {
    if (!this.clientsCache) return false;

    const now = Date.now();
    const isExpired = (now - this.clientsCache.timestamp) > this.CACHE_DURATION;
    const isSameUser = this.clientsCache.commercialUsername === commercialUsername;

    return !isExpired && isSameUser;
  }

  private updateCache(clients: Client[], commercialUsername: string): void {
    this.clientsCache = {
      data: clients,
      timestamp: Date.now(),
      commercialUsername
    };
  }

  private updateProgress(progress: ClientInitializationProgress): void {
    this.initializationProgress$.next(progress);
  }

  // Méthode pour vider le cache manuellement
  clearCache(): void {
    this.clientsCache = null;
    this.log.log('[ClientService] Cache cleared');
  }

  async createClientLocally(clientData: any, commercialUsername: string): Promise<{ client: Client, account: any }> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }

    // OPTIMIZATION: Don't load all clients. Use count to generate code.
    let totalClients = 0;
    try {
      totalClients = await this.clientRepositoryExtensions.countByCommercial(this.commercialUsername);
    } catch (error: any) {
      const errorMessage = `[ClientService] createClientLocally: Error counting clients. Message: ${error.message}`;
      this.log.log(errorMessage);
      console.error('Error counting clients:', error);
      throw error;
    }

    let clientCode: string;
    let accountNumber: string;
    let newClientIndex = totalClients + 1;

    clientCode = `${commercialUsername.slice(-2)}${newClientIndex.toString().padStart(3, '0')}`;
    accountNumber = `0021${commercialUsername.slice(-2)}${newClientIndex.toString().padStart(4, '0')}`;

    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localTime = new Date(now.getTime() - timezoneOffset);

    const newClient: Client = {
      ...clientData,
      id: this.generateUuid(),
      isLocal: true,
      isSync: false,
      commercial: commercialUsername,
      code: clientCode,
      createdAt: localTime.toISOString().slice(0, -5),
      syncDate: '',
      tontineCollector: commercialUsername
    };

    const newAccount: Account = {
      id: this.generateUuid(),
      accountNumber: accountNumber,
      accountBalance: clientData.balance || 0,
      status: 'ACTIF',
      clientId: newClient.id,
      isSync: false,
      syncDate: '',
      isLocal: true,
      createdAt: new Date().toISOString()
    };

    try {
      await this.clientRepository.saveAll([newClient]);
    } catch (error: any) {
      const errorMessage = `[ClientService] createClientLocally: Error saving client. Message: ${error.message}`;
      this.log.log(errorMessage);
      console.error('Error saving client:', error);
      throw error;
    }

    try {
      // Use AccountRepository instead of DatabaseService
      await this.accountRepository.saveAll([newAccount]);
    } catch (error: any) {
      const errorMessage = `[ClientService] createClientLocally: Error saving account. Message: ${error.message}`;
      this.log.log(errorMessage);
      console.error('Error saving account:', error);
      throw error;
    }

    return { client: newClient, account: newAccount };
  }


  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Public method to get clients as Observable for UI components
  getClients(): Observable<Client[]> {
    // WARNING: This loads all clients. UI should use pagination instead.
    // We return empty array to force usage of pagination, or we could implement a default pagination.
    // For now, let's log a warning and return empty to avoid memory crash.
    this.log.log('[ClientService] getClients called. This method is deprecated and returns empty. Use getClientsPaginated.');
    return of([]);
  }

  // Méthode pour obtenir des statistiques sur les clients
  async getClientStats(): Promise<{
    total: number;
    local: number;
    synced: number;
    withCredit: number;
    activeAccounts: number;
  }> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    try {
      // OPTIMIZATION: Use SQL counts instead of loading all objects
      const total = await this.clientRepositoryExtensions.countByCommercial(this.commercialUsername);
      const local = await this.clientRepositoryExtensions.countByCommercial(this.commercialUsername, { isLocal: true });
      const synced = await this.clientRepositoryExtensions.countByCommercial(this.commercialUsername, { isSync: true });
      const withCredit = await this.clientRepositoryExtensions.countWithActiveCreditByCommercial(this.commercialUsername);

      // For active accounts, we use a direct query via dbService or add a method to AccountRepository/ClientRepositoryExtensions
      // Since we don't have a direct method yet, let's use a raw query via dbService for now, but optimized.
      // Or better, let's add a method to ClientRepositoryExtensions if possible, or just use a raw count here.
      // We can use accountRepository if we add a count method there.
      // For now, let's use a raw query to avoid loading objects.
      const activeAccountsSql = `
        SELECT COUNT(*) as count
        FROM accounts a
        JOIN clients c ON a.clientId = c.id
        WHERE c.commercial = ? AND a.status = 'ACTIF'
      `;
      const activeAccountsResult = await this.dbService.query(activeAccountsSql, [this.commercialUsername]);
      const activeAccounts = activeAccountsResult.values?.[0]?.count || 0;

      return {
        total,
        local,
        synced,
        withCredit,
        activeAccounts
      };
    } catch (error: any) {
      this.log.log(`[ClientService] getClientStats error: ${error.message}`);
      return {
        total: 0,
        local: 0,
        synced: 0,
        withCredit: 0,
        activeAccounts: 0
      };
    }
  }

  // Méthode pour rechercher des clients avec pagination locale
  searchClients(query: string, limit: number = 50): Observable<Client[]> {
    if (!this.commercialUsername) return of([]);

    // OPTIMIZATION: Use paginated search directly
    return from(this.clientRepositoryExtensions.findByCommercialPaginated(
      this.commercialUsername,
      0,
      limit,
      { searchQuery: query }
    )).pipe(
      map(page => page.content),
      catchError(error => {
        this.log.log(`[ClientService] searchClients error: ${error.message}`);
        return of([]);
      })
    );
  }

  async updateClientCreditStatus(clientId: string, creditInProgress: boolean): Promise<void> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }

    // OPTIMIZATION: Update specific client instead of loading all
    const client = await this.clientRepository.findById(clientId);
    if (client) {
        client.creditInProgress = creditInProgress;
        await this.clientRepository.saveAll([client]);
    }
  }

  async updateClientBalance(clientId: string, balance: number): Promise<Account> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }

    // OPTIMIZATION: Fetch specific client and account
    const client = await this.clientRepository.findById(clientId);

    if (client) {
      // Use AccountRepository to find account by clientId
      const account = await this.accountRepository.findByClientId(clientId);

      if (account) {
        const isNumericId = /^[0-9]+$/.test(clientId);
        const IS_SYNC = isNumericId ? 1 : 0;

        if (account.accountBalance > 0 && IS_SYNC) {
          account.old_balance = account.accountBalance;
          account.updated = true;
          account.syncDate = new Date().toISOString();
        }
        account.accountBalance = balance;
        await this.accountRepository.saveAll([account]);
        return account;
      } else {
        // Create a new account
        const timestamp = Date.now().toString().slice(-6);
        const newAccountNumber = `0021${client.commercial.slice(-2)}${timestamp}`;

        const newAccount: Account = {
          id: this.generateUuid(),
          accountNumber: newAccountNumber,
          accountBalance: balance,
          status: 'ACTIF',
          clientId: clientId,
          isLocal: true,
          isSync: false,
          createdAt: new Date().toISOString(),
          syncDate: ''
        };
        await this.accountRepository.saveAll([newAccount]);
        return newAccount;
      }
    }
    throw new Error('Client not found');
  }

  async deleteClient(id: string): Promise<void> {
    // Use Repository instead of DatabaseService
    await this.clientRepository.deleteClientAndRelatedData(id);
  }

  async updateClient(client: Client): Promise<Client> {
    try {
      // Use Repository instead of DatabaseService
      return await this.clientRepository.updateClient(client);
    } catch (error) {
      console.error('Error in ClientService.updateClient calling repository.updateClient:', error);
      throw error; // Re-throw the error to be caught by the NgRx effect
    }
  }

  async updateClientLocation(id: string, latitude: number, longitude: number): Promise<Client> {
    // Use Repository instead of DatabaseService
    return await this.clientRepository.updateLocation(id, latitude, longitude);
  }

  async updateClientPhotosAndInfo(data: { clientId: string; cardType: string; cardID: string; profilPhoto: string | null; cardPhoto: string | null; profilPhotoUrl?: string | null; cardPhotoUrl?: string | null; }): Promise<Client> {
    // Use Repository instead of DatabaseService
    return await this.clientRepository.updatePhotosAndInfo(data);
  }

  async getClientById(id: string): Promise<Client> {
    const client = await this.clientRepository.findById(id);
    if (!client) {
      throw new Error('Client not found');
    }
    return client;
  }

  // ==================== PAGINATION METHODS ====================

  /**
   * Get paginated clients from local database
   *
   * **SECURITY**: This method requires commercialUsername for data isolation
   *
   * @param commercialUsername Username of the commercial (REQUIRED)
   * @param page Page number (zero-indexed)
   * @param size Number of items per page
   * @param filters Optional filters
   * @returns Page of clients
   */
  async getClientsPaginated(
    commercialUsername: string,
    page: number,
    size: number,
    filters?: ClientRepositoryFilters
  ): Promise<{ content: Client[]; totalElements: number; totalPages: number; page: number; size: number }> {
    if (!commercialUsername) {
      throw new Error('commercialUsername is required for security');
    }

    // Use ClientRepositoryExtensions for paginated query
    return this.clientRepositoryExtensions.findByCommercialPaginated(commercialUsername, page, size, filters);
  }

}
