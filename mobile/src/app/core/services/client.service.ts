import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, concatMap, BehaviorSubject } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
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
    private store: Store // Inject Store
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

              await this.dbService.saveClients(clients);
              this.updateCache(clients, commercialUsername);

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
                await this.photoSyncService.syncPhotosForClients();
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

              const localClients = await this.getLocalClients();
              this.updateProgress({
                isLoading: false,
                currentPage: 0,
                totalPages: 0,
                loadedClients: localClients.length,
                totalClients: localClients.length,
                message: `${localClients.length} clients chargés localement`
              });

              return localClients;
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

          return from(this.getLocalClients()).pipe(
            switchMap(clients => {
              this.updateProgress({
                isLoading: false,
                currentPage: 0,
                totalPages: 0,
                loadedClients: clients.length,
                totalClients: clients.length,
                message: `${clients.length} clients chargés en mode hors ligne`
              });
              return of(clients);
            })
          );
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
    if (!this.commercialUsername) {
      this.log.log('[ClientService] getLocalClients: commercialUsername is undefined.');
      throw new Error('Commercial user not identified.');
    }
    const clients = await this.dbService.getClients(this.commercialUsername); // Pass commercialUsername
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
    let clients: Client[] = [];
    let accounts: any[] = [];
    try {
      clients = await this.dbService.getClients(this.commercialUsername);
      accounts = await this.dbService.getAccounts(this.commercialUsername);
    } catch (error: any) {
      const errorMessage = `[ClientService] createClientLocally: Error getting data. Message: ${error.message}, Stack: ${error.stack}, Error: ${JSON.stringify(error)}`;
      this.log.log(errorMessage);
      console.error('Error getting data:', error);
      throw error; // Re-throw the error to be handled by the caller
    }

    let clientCode: string;
    let accountNumber: string;
    let newClientIndex = clients.length + 1;
    let isUnique = false;

    do {
      clientCode = `${commercialUsername.slice(-2)}${newClientIndex.toString().padStart(3, '0')}`;
      accountNumber = `0021${commercialUsername.slice(-2)}${newClientIndex.toString().padStart(4, '0')}`;

      const clientExists = clients.some(c => c.code === clientCode);
      const accountExists = accounts.some(a => a.accountNumber === accountNumber);

      if (!clientExists && !accountExists) {
        isUnique = true;
      } else {
        newClientIndex++;
      }
    } while (!isUnique);


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
      syncDate: ''
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

    const updatedClients = [...clients, newClient];
    try {
      await this.dbService.saveClients(updatedClients);
    } catch (error: any) {
      const errorMessage = `[ClientService] createClientLocally: Error saving clients. Message: ${error.message}, Stack: ${error.stack}, Error: ${JSON.stringify(error)}`;
      this.log.log(errorMessage);
      console.error('Error saving clients:', error);
      throw error;
    }

    try {
      await this.dbService.saveAccounts([newAccount]);
    } catch (error: any) {
      const errorMessage = `[ClientService] createClientLocally: Error saving accounts. Message: ${error.message}, Stack: ${error.stack}, Error: ${JSON.stringify(error)}`;
      this.log.log(errorMessage);
      console.error('Error saving accounts:', error);
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
      const clients = await this.dbService.getClients(this.commercialUsername);
      const accounts = await this.dbService.getAccounts(this.commercialUsername);

      return {
        total: clients.length,
        local: clients.filter(c => c.isLocal).length,
        synced: clients.filter(c => c.isSync).length,
        withCredit: clients.filter(c => c.creditInProgress).length,
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
    return from(this.getLocalClients()).pipe(
      switchMap(clients => {
        const filteredClients = clients
          .filter(client =>
            client.firstname?.toLowerCase().includes(query.toLowerCase()) ||
            client.lastname?.toLowerCase().includes(query.toLowerCase()) ||
            client.code?.toLowerCase().includes(query.toLowerCase()) ||
            client.phone?.includes(query)
          )
          .slice(0, limit);

        return of(filteredClients);
      }),
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
    const clients = await this.dbService.getClients(this.commercialUsername);
    const clientIndex = clients.findIndex(c => c.id === clientId);
    if (clientIndex > -1) {
      clients[clientIndex].creditInProgress = creditInProgress;
      await this.dbService.saveClients(clients);
    }
  }

  async updateClientBalance(clientId: string, balance: number): Promise<Account> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    const clients = await this.dbService.getClients(this.commercialUsername);
    const clientIndex = clients.findIndex(c => c.id === clientId);
    const isNumericId = /^[0-9]+$/.test(clientId);
    const IS_SYNC = isNumericId ? 1 : 0;
    if (clientIndex > -1) {
      const client = clients[clientIndex];
      const accounts = await this.dbService.getAccounts(this.commercialUsername);
      const accountIndex = accounts.findIndex(a => a.clientId === clientId);
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
        let newAccountNumber: string;
        let isUnique = false;
        let newAccountIndex = clients.length + 1;

        do {
          newAccountNumber = `0021${client.commercial.slice(-2)}${newAccountIndex.toString().padStart(4, '0')}`;
          const accountExists = accounts.some(a => a.accountNumber === newAccountNumber);
          if (!accountExists) {
            isUnique = true;
          } else {
            newAccountIndex++;
          }
        } while (!isUnique);

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
    await this.dbService.deleteClientAndRelatedData(id);
  }

  async updateClient(client: Client): Promise<Client> {
    try {
      return await this.dbService.updateClient(client);
    } catch (error) {
      console.error('Error in ClientService.updateClient calling dbService.updateClient:', error);
      throw error; // Re-throw the error to be caught by the NgRx effect
    }
  }

  async updateClientLocation(id: string, latitude: number, longitude: number): Promise<Client> {
    return await this.dbService.updateClientLocation(id, latitude, longitude);
  }

  async updateClientPhotosAndInfo(data: { clientId: string; cardType: string; cardID: string; profilPhoto: string | null; cardPhoto: string | null; profilPhotoUrl?: string | null; cardPhotoUrl?: string | null; }): Promise<Client> {
    return await this.dbService.updateClientPhotosAndInfo(data);
  }


}
