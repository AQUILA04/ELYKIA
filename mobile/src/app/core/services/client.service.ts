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
    private clientRepositoryExtensions: ClientRepositoryExtensions
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
              this.updateProgress({
                isLoading: true,
                currentPage: 0,
                totalPages: 0,
                loadedClients: clients.length,
                totalClients: clients.length,
                message: 'Sauvegarde des clients...'
              });

              // Use Repository instead of DatabaseService
              await this.clientRepository.saveAll(clients);
              // We don't update cache with ALL clients anymore to avoid memory issues
              // this.updateCache(clients, commercialUsername);

              this.updateProgress({
                isLoading: true,
                currentPage: 0,
                totalPages: 0,
                loadedClients: clients.length,
                totalClients: clients.length,
                message: 'Synchronisation des photos en cours...'
              });

              // Synchroniser les photos après l'initialisation des clients
              try {
                // Utiliser la nouvelle méthode de synchronisation par batch
                await this.photoSyncService.syncPhotosForClients(clients);
                this.log.log('[ClientService] Photo synchronization completed');
              } catch (error) {
                this.log.log(`[ClientService] Photo synchronization failed: ${error}`);
                // Ne pas faire échouer l'initialisation si la sync des photos échoue
              }

              this.updateProgress({
                isLoading: false,
                currentPage: 0,
                totalPages: 0,
                loadedClients: clients.length,
                totalClients: clients.length,
                message: `${clients.length} clients synchronisés avec succès`
              });

              return clients;
            }),
            catchError(async (error) => {
              this.log.log(`[ClientService] API fetch failed: ${error.message}`);
              this.updateProgress({
                isLoading: true,
                currentPage: 0,
                totalPages: 0,
                loadedClients: 0,
                totalClients: 0,
                message: 'Chargement des clients locaux...'
              });

              // In offline mode or error, we don't load all clients anymore.
              // We return an empty array or just the first page if needed,
              // but the UI should handle pagination.
              // For backward compatibility, we might return empty array.
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
            isLoading: true,
            currentPage: 0,
            totalPages: 0,
            loadedClients: 0,
            totalClients: 0,
            message: 'Mode hors ligne - Chargement des clients locaux...'
          });

          // In offline mode, we don't load all clients.
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
    return this.fetchAllClientsPaginated(commercialUsername, 0, this.PAGE_SIZE, []);
  }

  private fetchAllClientsPaginated(commercialUsername: string, page: number, size: number, accumulatedClients: Client[]): Observable<Client[]> {
    // Protection contre les boucles infinies
    if (accumulatedClients.length >= this.MAX_CLIENTS) {
      this.log.log(`[ClientService] Maximum client limit reached (${this.MAX_CLIENTS}). Stopping pagination.`);
      return of(accumulatedClients);
    }

    const url = `${environment.apiUrl}/api/v1/clients/by-commercial/${commercialUsername}?page=${page}&size=${size}&sort=id,desc`;

    return this.http.get<ApiResponse<{ content: Client[]; page: { totalPages: number; number: number; totalElements: number } }>>(url).pipe(
      switchMap(response => {
        const clients = response.data.content;
        const pageInfo = response.data.page;
        const allClients = [...accumulatedClients, ...clients];

        // Mise à jour du progrès
        this.updateProgress({
          isLoading: true,
          currentPage: page + 1,
          totalPages: pageInfo.totalPages,
          loadedClients: allClients.length,
          totalClients: pageInfo.totalElements || allClients.length,
          message: `Chargement page ${page + 1}/${pageInfo.totalPages}...`
        });

        this.log.log(`[ClientService] Fetched page ${page + 1}/${pageInfo.totalPages}, ${clients.length} clients (Total: ${allClients.length})`);

        // Si c'est la dernière page ou s'il n'y a plus de clients, retourner tous les clients
        if (page >= pageInfo.totalPages - 1 || clients.length === 0) {
          this.log.log(`[ClientService] Pagination complete. Total clients: ${allClients.length}`);
          return of(allClients);
        }

        // Sinon, récupérer la page suivante
        return this.fetchAllClientsPaginated(commercialUsername, page + 1, size, allClients);
      }),
      catchError(error => {
        this.log.log(`[ClientService] Error fetching page ${page}: ${error.message}`);
        // En cas d'erreur, retourner les clients déjà récupérés
        if (accumulatedClients.length > 0) {
          this.log.log(`[ClientService] Returning ${accumulatedClients.length} clients despite error`);
        }
        return of(accumulatedClients);
      })
    );
  }

  private async getLocalClients(): Promise<Client[]> {
    // This method is deprecated and should be avoided.
    // It loads all clients into memory.
    if (!this.commercialUsername) {
      this.log.log('[ClientService] getLocalClients: commercialUsername is undefined.');
      throw new Error('Commercial user not identified.');
    }
    // Use Repository instead of DatabaseService
    // WARNING: This still loads all clients. Should be used with caution or refactored.
    // For now, we keep it but it's discouraged.
    const clients = await this.clientRepository.findAllByCommercial(this.commercialUsername);
    if (clients.length > 0) {
      return clients;
    } else {
      this.log.log('[ClientService] getLocalClients: No clients found locally.');
      throw new Error('Impossible de charger les clients. Veuillez vérifier votre connexion ou synchroniser.');
    }
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

  // public getClients(): Observable<Client[]> {
  //   return from(this.dbService.getClients());
  // }

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
    // Note: We are simplifying the uniqueness check for performance.
    // In a real high-concurrency scenario, we'd need a DB constraint or a 'checkExists' method.
    // Assuming sequential generation is safe enough for single-user local DB.

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

    const newAccount = {
      id: this.generateUuid(),
      accountNumber: accountNumber,
      accountBalance: clientData.balance || 0,
      status: 'ACTIF',
      clientId: newClient.id,
      isSync: false,
      syncDate: ''
    };

    try {
      // Use Repository instead of DatabaseService
      await this.clientRepository.saveAll([newClient]);
    } catch (error: any) {
      const errorMessage = `[ClientService] createClientLocally: Error saving client. Message: ${error.message}`;
      this.log.log(errorMessage);
      console.error('Error saving client:', error);
      throw error;
    }

    try {
      await this.dbService.saveAccounts([newAccount]);
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
    return from(this.getLocalClients()).pipe(
      catchError(error => {
        this.log.log(`[ClientService] getClients: Error caught: ${error.message}`);
        return of([]);
      })
    );
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

      // For active accounts, we might need a specific query or keep using dbService if optimized
      // Assuming dbService.getAccounts loads all accounts (bad), we should optimize this too.
      // For now, let's use a direct count query if possible, or fallback to existing method but be aware of perf.
      // Since we don't have AccountRepositoryExtensions yet, we'll leave activeAccounts as is or mock it if not critical.
      // Actually, let's try to use a direct query via dbService if exposed, or just accept the cost for this specific stat for now.
      const accounts = await this.dbService.getAccounts(this.commercialUsername);

      return {
        total,
        local,
        synced,
        withCredit,
        activeAccounts: accounts.filter(a => a.status === 'ACTIF').length
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
      const accounts = await this.dbService.getAccounts(this.commercialUsername); // Still loading all accounts... needs AccountRepository
      const accountIndex = accounts.findIndex(a => a.clientId === clientId);

      const isNumericId = /^[0-9]+$/.test(clientId);
      const IS_SYNC = isNumericId ? 1 : 0;

      if (accountIndex > -1 && IS_SYNC) {
        if (accounts[accountIndex].accountBalance > 0) {
          accounts[accountIndex].old_balance = accounts[accountIndex].accountBalance;
          accounts[accountIndex].updated = true;
          accounts[accountIndex].syncDate = new Date().toISOString();
        }
        accounts[accountIndex].accountBalance = balance;
        await this.dbService.saveAccounts(accounts);
        return accounts[accountIndex];
      } else if (accountIndex > -1) {
        accounts[accountIndex].accountBalance = balance;
        await this.dbService.saveAccounts(accounts);
        return accounts[accountIndex];
      } else {
        // Create a new account
        // We need a unique account number. Without loading all, we can use timestamp or random.
        // Or count existing accounts.
        // For now, let's use a timestamp-based approach to avoid collisions without loading all.
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
        await this.dbService.saveAccounts([newAccount]);
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
