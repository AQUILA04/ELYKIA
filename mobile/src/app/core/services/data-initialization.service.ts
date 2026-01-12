import { Injectable } from '@angular/core';
import { concatMap, from, Observable, of, switchMap } from 'rxjs';
import { catchError, filter, map, take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ArticleService } from './article.service';
import { LocalityService } from './locality.service';
import { Store } from '@ngrx/store';
import * as LocalityActions from '../../store/locality/locality.actions';
import { ClientService } from './client.service';
import * as ClientActions from '../../store/client/client.actions';
import * as ArticleActions from '../../store/article/article.actions';
import { CommercialService } from './commercial.service';
import * as CommercialActions from '../../store/commercial/commercial.actions';
import { StockOutputService } from './stock-output.service';
import * as StockOutputActions from '../../store/stock-output/stock-output.actions';
import { DistributionService } from './distribution.service';
import * as DistributionActions from '../../store/distribution/distribution.actions';
import { AccountService } from './account.service';
import * as AccountActions from '../../store/account/account.actions';
import * as RecoveryActions from '../../store/recovery/recovery.actions';
import * as TransactionActions from '../../store/transaction/transaction.actions';
import { DatabaseService } from "./database.service";
import { RecoveryService } from "./recovery.service";
import { TransactionService } from "./transaction.service";
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { LoggerService } from './logger.service';
import { TontineService } from './tontine.service';
import * as TontineActions from '../../store/tontine/tontine.actions';

@Injectable({
  providedIn: 'root'
})
export class DataInitializationService {
  private commercialUsername: string | undefined;

  constructor(
    private articleService: ArticleService,
    private localityService: LocalityService,
    private clientService: ClientService,
    private commercialService: CommercialService,
    private stockOutputService: StockOutputService,
    private distributionService: DistributionService,
    private accountService: AccountService,
    private store: Store,
    private dbService: DatabaseService,
    private recoveryService: RecoveryService,
    private transactionService: TransactionService,
    private log: LoggerService,
    private tontineService: TontineService,
    private http: HttpClient
  ) {
    this.store.select(selectAuthUser).subscribe(user => {
      this.commercialUsername = user?.username;
    });
  }

  initializeArticles(): Observable<boolean> {
    return this.articleService.initializeArticles().pipe(
      map(() => {
        this.store.dispatch(ArticleActions.loadArticles());
        return true;
      }),
      catchError((error) => {
        console.error('Error initializing articles:', error);
        return of(false);
      })
    );
  }

  initializeLocalities(): Observable<boolean> {
    return this.localityService.initializeLocalities().pipe(
      map(() => {
        this.store.dispatch(LocalityActions.loadLocalities());
        return true;
      }),
      catchError((error) => {
        console.error('Error initializing localities:', error);
        return of(false);
      })
    );
  }

  initializeClients(forceRefresh: boolean = false): Observable<boolean> {
    return this.store.select(selectAuthUser).pipe(
      take(1), // On prend la valeur une seule fois et on se désabonne
      filter(user => !!user), // On s'assure que l'utilisateur existe
      switchMap(user => {
        const commercialUsername = user.username;
        // On a maintenant la certitude d'avoir le username
        return this.clientService.initializeClients(commercialUsername, forceRefresh).pipe(
          map(() => {
            this.store.dispatch(ClientActions.loadClients({ commercialUsername }));
            return true;
          }),
          catchError(error => {
            console.error('[DataInitializationService] initializeClients error:', error);
            return of(false);
          })
        );
      })
    );
  }

  // Nouvelle méthode pour obtenir le progrès d'initialisation des clients
  getClientInitializationProgress() {
    return this.clientService.getInitializationProgress();
  }

  // Méthode pour forcer le rafraîchissement des clients
  refreshClients(): Observable<boolean> {
    return this.initializeClients(true);
  }

  initializeCommercial(): Observable<boolean> {
    return this.store.select(selectAuthUser).pipe(
      take(1),
      filter(user => !!user),
      switchMap(user => {
        const commercialUsername = user.username;
        return this.commercialService.initializeCommercial(commercialUsername).pipe(
          map(() => {
            this.store.dispatch(CommercialActions.loadCommercial({ commercialUsername }));
            return true;
          }),
          catchError(error => of(false))
        );
      })
    );
  }


  initializeStockOutputs(): Observable<boolean> {
    return this.store.select(selectAuthUser).pipe(
      take(1),
      filter(user => !!user),
      switchMap(user => {
        const commercialUsername = user.username;
        return this.stockOutputService.initializeStockOutputs(commercialUsername).pipe(
          map(() => {
            this.store.dispatch(StockOutputActions.loadStockOutputs({ commercialUsername }));
            return true;
          }),
          catchError(error => of(false))
        );
      })
    );
  }

  initializeDistributions(): Observable<boolean> {
    return this.store.select(selectAuthUser).pipe(
      take(1),
      filter(user => !!user),
      switchMap(user => {
        return this.distributionService.initializeDistributions().pipe(
          map(() => {
            this.store.dispatch(DistributionActions.loadDistributions({ commercialUsername: user.username }));
            return true;
          }),
          catchError((error) => {
            console.error('Error initializing distributions:', error);
            return of(false);
          })
        );
      })
    );
  }

  initializeAccounts(): Observable<boolean> {
    return this.accountService.initializeAccounts().pipe(
      map(() => {
        this.store.dispatch(AccountActions.loadAccounts());
        return true;
      }),
      catchError((error) => {
        console.error('Error initializing accounts:', error);
        return of(false);
      })
    );
  }

  initializeRecoveries(): Observable<boolean> {
    return this.store.select(selectAuthUser).pipe(
      take(1),
      filter(user => !!user),
      switchMap(user => {
        return this.recoveryService.initializeRecoveries().pipe(
          switchMap(() => this.initializeMobileRecoveriesFromBackend(user.username)),
          map(() => {
            this.store.dispatch(RecoveryActions.loadRecoveries({ commercialUsername: user.username }));
            return true;
          }),
          catchError((error) => {
            console.error('Error initializing recoveries:', error);
            return of(false);
          })
        );
      })
    );
  }

  initializeTransactions(): Observable<boolean> {
    return this.store.select(selectAuthUser).pipe(
      take(1),
      filter(user => !!user),
      switchMap(user => {
        return this.initializeMobileTransactionsFromBackend(user.username).pipe(
          map(() => {
            this.store.dispatch(TransactionActions.loadTransactions());
            return true;
          }),
          catchError((error) => {
            console.error('Error initializing transactions:', error);
            return of(false);
          })
        );
      })
    );
  }
  }

  initializeTontine(): Observable<boolean> {
    return this.tontineService.initializeTontine().pipe(
      map(() => {
        this.store.dispatch(TontineActions.loadTontineSession());
        return true;
      }),
      catchError(error => {
        console.error('Error initializing tontine:', error);
        return of(false);
      })
    );
  }

  calculateArticleStocks(): Observable<boolean> {
    return from(this.calculateAndUpdateStocks()).pipe(
      map(() => {
        // Reload articles in store to reflect updated stock quantities
        this.store.dispatch(ArticleActions.loadArticles());
        return true;
      }),
      catchError((error) => {
        this.log.log(`[DataInitializationService] calculateArticleStocks failed: ${JSON.stringify(error)}`);
        console.error('Error calculating article stocks:', error);
        return of(false);
      })
    );
  }

  private async calculateAndUpdateStocks(): Promise<void> {
    try {
      // Get all articles and stock output items
      const articles = await this.dbService.getArticles();
      const stockOutputItems = await this.dbService.getStockOutputItems();

      // Create a map to store total quantities per article
      const articleStockMap = new Map<string, number>();

      // Initialize all articles with 0 stock
      articles.forEach(article => {
        articleStockMap.set(article.id, 0);
      });

      // Calculate total quantities from stock output items
      stockOutputItems.forEach(item => {
        const currentStock = articleStockMap.get(item.articleId) || 0;
        articleStockMap.set(item.articleId, currentStock + item.quantity);
      });


      // Update articles with calculated stock quantities
      const updatedArticles = articles.map(article => ({
        ...article,
        stockQuantity: articleStockMap.get(article.id) || 0
      }));

      // Save updated articles back to database
      await this.dbService.saveArticles(updatedArticles);
      console.log('Article stocks updated successfully');
    } catch (error: any) {
      const errorMessage = `[DataInitializationService] Error in calculateAndUpdateStocks. Message: ${error.message}, Stack: ${error.stack}`;
      this.log.log(errorMessage);
      console.error('Error in calculateAndUpdateStocks:', error);
      throw error;
    }
  }

  backupDatabase(): Observable<boolean> {
    console.log('DATABASE BACKUP...!!!');
    return from(this.performDatabaseBackup()).pipe(
      map(() => {
        console.log('DATABASE BACKUP ENDED');
        return true;
      }),
      catchError((error) => {
        console.error('Error backing up database:', error);
        return of(false);
      })
    );
  }

  private async performDatabaseBackup(): Promise<void> {
    try {
      // Export database to SQL file
      const backupData = await this.dbService.exportDatabase();
      await this.dbService.saveBackupToFile(backupData);
      console.log('Database backup completed successfully');
    } catch (error) {
      console.error('Error in performDatabaseBackup:', error);
      throw error;
    }
  }

  scheduleBackup(): void {
    const threeHours = 3 * 60 * 60 * 1000;
    setInterval(() => {
      const now = new Date();
      const hour = now.getHours();

      if (hour >= 9 && hour <= 18) {
        this.backupDatabase().subscribe({
          next: () => console.log('Scheduled backup completed successfully.'),
          error: (err) => console.error('Scheduled backup failed:', err)
        });
      }
    }, threeHours);
  }

  async validateInitialData(): Promise<boolean> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    const articles = await this.dbService.getArticles();
    const localities = await this.dbService.getLocalities();
    const clients = await this.dbService.getClients(this.commercialUsername);
    const commercial = await this.dbService.getCommercial();
    const accounts = await this.dbService.getAccounts(this.commercialUsername);

    if (articles.length === 0 || localities.length === 0 || !commercial) {
      return false;
    }

    return !(clients.length > 0 && accounts.length === 0);

  }

  async restoreFromBackup(backupFilePath?: string): Promise<void> {
    this.log.log('[DataInitializationService] Starting restore from backup...');

    let fileToRestore: string | null | undefined = backupFilePath;
    if (!fileToRestore) {
      fileToRestore = await this.dbService.findLatestBackupFile();
    }

    if (!fileToRestore) {
      this.log.log('[DataInitializationService] No backup file found.');
      throw new Error('Aucun fichier de sauvegarde trouvé.');
    }

    this.log.log(`[DataInitializationService] Found backup file: ${fileToRestore}, starting restore.`);
    await this.dbService.restoreFromBackup(fileToRestore);
    this.log.log('[DataInitializationService] Restore complete.');
  }


  public initializeAllData(user: any): Observable<boolean> {
    return this.initializeArticles().pipe(
      concatMap(() => this.initializeCommercial()),
      concatMap(() => this.initializeLocalities()),
      concatMap(() => this.initializeClients()),
      concatMap(() => this.initializeStockOutputs()),
      concatMap(() => this.initializeDistributions()),
      concatMap(() => this.initializeAccounts()),
      concatMap(() => this.initializeRecoveries()),
      concatMap(() => this.initializeTontine()),
      concatMap(() => from(this.validateInitialData()))
    );
  }

}


  // ==================== MÉTHODES POUR RÉCUPÉRATION DEPUIS LE BACKEND ====================

  /**
   * Initialiser les recouvrements mobiles depuis le backend
   */
  private initializeMobileRecoveriesFromBackend(commercialUsername: string): Observable<boolean> {
    const url = `${environment.apiUrl}/api/v1/mobiles/recoveries/${commercialUsername}`;
    
    return this.http.get<any>(url).pipe(
      switchMap(async (response) => {
        if (response.success && response.data) {
          // Filtrer pour ne récupérer que les données du mois en cours
          const currentMonthRecoveries = this.filterCurrentMonthData(response.data, 'paymentDate');
          await this.dbService.saveMobileRecoveriesFromBackend(currentMonthRecoveries);
          this.log.log(`[DataInitializationService] Initialized ${currentMonthRecoveries.length} mobile recoveries from backend`);
        }
        return true;
      }),
      catchError((error) => {
        this.log.log(`[DataInitializationService] Error initializing mobile recoveries: ${error.message}`);
        console.error('Error initializing mobile recoveries from backend:', error);
        return of(true); // Continue même en cas d'erreur
      })
    );
  }

  /**
   * Initialiser les transactions mobiles depuis le backend
   */
  private initializeMobileTransactionsFromBackend(commercialUsername: string): Observable<boolean> {
    const url = `${environment.apiUrl}/api/v1/mobiles/transactions/${commercialUsername}`;
    
    return this.http.get<any>(url).pipe(
      switchMap(async (response) => {
        if (response.success && response.data) {
          // Filtrer pour ne récupérer que les données du mois en cours
          const currentMonthTransactions = this.filterCurrentMonthData(response.data, 'date');
          await this.dbService.saveMobileTransactionsFromBackend(currentMonthTransactions);
          this.log.log(`[DataInitializationService] Initialized ${currentMonthTransactions.length} mobile transactions from backend`);
        }
        return true;
      }),
      catchError((error) => {
        this.log.log(`[DataInitializationService] Error initializing mobile transactions: ${error.message}`);
        console.error('Error initializing mobile transactions from backend:', error);
        return of(true); // Continue même en cas d'erreur
      })
    );
  }

  /**
   * Filtrer les données pour ne garder que celles du mois en cours
   */
  private filterCurrentMonthData(data: any[], dateField: string): any[] {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    });
  }