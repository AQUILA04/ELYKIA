import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, throwError, EMPTY } from 'rxjs';
import { switchMap, map, catchError, tap, expand, reduce, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { selectToken } from '../../../store/auth/auth.selectors';
import { environment } from 'src/environments/environment';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../logger.service';
import {
  ISequentialSyncManager,
  SyncOptions,
  MembersSyncResult,
  CollectionsSyncResult,
  StocksSyncResult,
  SyncError,
  SyncErrorType,
  SyncContext
} from '../../models/tontine-sync.models';

/**
 * Gestionnaire de synchronisation séquentielle
 * 
 * Responsabilité: Gérer la synchronisation séquentielle des données paginées
 * - Traite chaque page séquentiellement (une à la fois)
 * - Gère la pagination correctement et s'arrête à la dernière page
 * - Implémente le batching pour optimiser les performances
 * - Empêche les synchronisations concurrentes via un système de verrous
 */
@Injectable({
  providedIn: 'root'
})
export class SequentialSyncManager implements ISequentialSyncManager {
  private apiUrl = environment.apiUrl + '/api/v1';
  
  // Verrous pour empêcher les synchronisations concurrentes
  private membersSyncLock = false;
  private collectionsSyncLock = false;
  private stocksSyncLock = false;

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private log: LoggerService,
    private store: Store
  ) {}

  /**
   * Obtient les headers HTTP avec le token d'authentification
   */
  private getHeaders(): Observable<HttpHeaders> {
    return this.store.select(selectToken).pipe(
      take(1),
      map(token => {
        let headers = new HttpHeaders();
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
      })
    );
  }

  /**
   * Crée un contexte d'erreur pour le logging
   */
  private createErrorContext(
    sessionId: string,
    commercialUsername: string,
    currentStep: string,
    currentPage?: number
  ): SyncContext {
    return {
      sessionId,
      commercialUsername,
      currentStep,
      currentPage,
      timestamp: new Date()
    };
  }

  /**
   * Crée une erreur de synchronisation
   */
  private createSyncError(
    type: SyncErrorType,
    message: string,
    context: SyncContext,
    retryable: boolean = false
  ): SyncError {
    return {
      type,
      message,
      context,
      timestamp: new Date(),
      retryable
    };
  }

  /**
   * Synchronise les membres de manière séquentielle
   * 
   * Exigences: 2.1, 2.2, 2.3, 5.3
   * - Traite chaque page séquentiellement
   * - Attend la complétion de chaque page avant de traiter la suivante
   * - S'arrête à la dernière page
   * - Utilise le batching pour les performances
   */
  syncMembers(sessionId: string, options: SyncOptions): Observable<MembersSyncResult> {
    // Exigence 2.4: Empêcher les synchronisations concurrentes
    if (this.membersSyncLock) {
      const error = this.createSyncError(
        SyncErrorType.VALIDATION,
        'Une synchronisation des membres est déjà en cours',
        this.createErrorContext(sessionId, options.commercialUsername, 'syncMembers'),
        false
      );
      
      return throwError(() => error);
    }

    this.membersSyncLock = true;
    this.log.log(`SequentialSyncManager: Starting members sync for session ${sessionId}`);

    const result: MembersSyncResult = {
      sessionId,
      totalPages: 0,
      processedPages: 0,
      totalItems: 0,
      savedItems: 0,
      errors: []
    };

    // Récupérer les totaux non synchronisés pour ajustement
    return from(this.dbService.getUnsyncedCollectionsTotals()).pipe(
      switchMap(unsyncedTotals => {
        const unsyncedMap = new Map<string, number>();
        unsyncedTotals.forEach(t => unsyncedMap.set(String(t.tontineMemberId), t.total));

        // Traitement séquentiel des pages avec expand
        return this.getHeaders().pipe(
          switchMap(headers => {
            // Fonction récursive pour traiter les pages séquentiellement
            const fetchPage = (page: number): Observable<any> => {
              const context = this.createErrorContext(
                sessionId,
                options.commercialUsername,
                'fetchMembers',
                page
              );

              return this.http.get<any>(
                `${this.apiUrl}/tontines/members?page=${page}&size=${options.batchSize}`,
                { headers }
              ).pipe(
                catchError(error => {
                  const syncError = this.createSyncError(
                    SyncErrorType.NETWORK,
                    `Erreur réseau lors de la récupération de la page ${page}: ${error.message}`,
                    context,
                    true
                  );
                  result.errors.push(syncError);
                  this.log.log(`SequentialSyncManager: Network error on page ${page}: ${error.message}`);
                  return throwError(() => syncError);
                }),
                switchMap(response => {
                  const pageData = response.data;
                  const members = pageData.content || [];
                  const currentPage = pageData.page.number || 0;
                  const totalPages = pageData.page.totalPages || 1;
                  const totalElements = pageData.page.totalElements || 0;

                  // Mise à jour des métadonnées du résultat
                  if (result.totalPages === 0) {
                    result.totalPages = totalPages;
                    result.totalItems = totalElements;
                  }

                  this.log.log(
                    `SequentialSyncManager: Processing members page ${currentPage + 1}/${totalPages} - ${members.length} members`
                  );

                  if (members.length === 0) {
                    return EMPTY;
                  }

                  // Mapper les membres avec ajustement des totaux
                  const mappedMembers = members.map((m: any) => {
                    const serverTotal = m.totalContribution || 0;
                    const memberIdStr = String(m.id);
                    const localUnsynced = unsyncedMap.get(memberIdStr) || 0;
                    const adjustedTotal = serverTotal + localUnsynced;

                    return {
                      id: m.id,
                      tontineSessionId: sessionId,
                      clientId: m.client?.id,
                      commercialUsername: options.commercialUsername,
                      totalContribution: adjustedTotal,
                      deliveryStatus: m.deliveryStatus,
                      registrationDate: m.registrationDate,
                      frequency: m.frequency,
                      amount: m.amount,
                      notes: m.notes,
                      isLocal: false,
                      isSync: true,
                      updateScope: null
                    };
                  });

                  // Mapper les deliveries
                  const deliveries: any[] = [];
                  members.forEach((m: any) => {
                    if (m.delivery) {
                      deliveries.push({
                        id: m.delivery.id,
                        tontineMemberId: m.id,
                        commercialUsername: options.commercialUsername,
                        requestDate: m.delivery.requestDate,
                        deliveryDate: m.delivery.deliveryDate,
                        totalAmount: m.delivery.totalAmount,
                        status: m.delivery.status,
                        isLocal: false,
                        isSync: true,
                        items: m.delivery.items ? m.delivery.items.map((i: any) => {
                          const articleId = i.articleId || i.articles?.id || i.article?.id;
                          return {
                            id: i.id,
                            tontineDeliveryId: m.delivery.id,
                            articleId: articleId,
                            quantity: i.quantity,
                            unitPrice: i.unitPrice,
                            totalPrice: i.totalPrice
                          };
                        }) : []
                      });
                    }
                  });

                  // Sauvegarder les membres et deliveries
                  return from(this.dbService.saveTontineMembers(mappedMembers)).pipe(
                    switchMap(() => {
                      if (deliveries.length > 0) {
                        return from(this.dbService.saveTontineDeliveries(deliveries));
                      }
                      return from(Promise.resolve());
                    }),
                    map(() => {
                      result.processedPages++;
                      result.savedItems += mappedMembers.length;
                      
                      this.log.log(
                        `SequentialSyncManager: Saved page ${currentPage + 1}/${totalPages} - ${mappedMembers.length} members, ${deliveries.length} deliveries`
                      );

                      // Exigence 2.3: S'arrêter à la dernière page
                      return {
                        currentPage,
                        totalPages,
                        hasMore: currentPage < totalPages - 1
                      };
                    }),
                    catchError(error => {
                      const syncError = this.createSyncError(
                        SyncErrorType.DATABASE,
                        `Erreur de base de données lors de la sauvegarde de la page ${page}: ${error.message}`,
                        context,
                        false
                      );
                      result.errors.push(syncError);
                      this.log.log(`SequentialSyncManager: Database error on page ${page}: ${error.message}`);
                      return throwError(() => syncError);
                    })
                  );
                })
              );
            };

            // Exigence 2.1 et 2.2: Traitement séquentiel avec expand
            // expand traite chaque page séquentiellement et attend la complétion
            return fetchPage(0).pipe(
              expand(pageInfo => 
                pageInfo.hasMore ? fetchPage(pageInfo.currentPage + 1) : EMPTY
              ),
              reduce(() => result, result)
            );
          })
        );
      }),
      tap(() => {
        this.membersSyncLock = false;
        this.log.log(
          `SequentialSyncManager: Members sync completed - ${result.savedItems}/${result.totalItems} items saved, ${result.errors.length} errors`
        );
      }),
      catchError(error => {
        this.membersSyncLock = false;
        this.log.log(`SequentialSyncManager: Members sync failed: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Synchronise les collections de manière séquentielle
   * 
   * Exigences: 2.1, 2.2, 2.3, 5.3
   */
  syncCollections(options: SyncOptions): Observable<CollectionsSyncResult> {
    // Exigence 2.4: Empêcher les synchronisations concurrentes
    if (this.collectionsSyncLock) {
      const error = this.createSyncError(
        SyncErrorType.VALIDATION,
        'Une synchronisation des collections est déjà en cours',
        this.createErrorContext('', options.commercialUsername, 'syncCollections'),
        false
      );
      
      return throwError(() => error);
    }

    this.collectionsSyncLock = true;
    this.log.log('SequentialSyncManager: Starting collections sync');

    const result: CollectionsSyncResult = {
      totalPages: 0,
      processedPages: 0,
      totalItems: 0,
      savedItems: 0,
      membersProcessed: 0,
      errors: []
    };

    return this.getHeaders().pipe(
      switchMap(headers => {
        // Fonction récursive pour traiter les pages séquentiellement
        const fetchPage = (page: number): Observable<any> => {
          const context = this.createErrorContext(
            '',
            options.commercialUsername,
            'fetchCollections',
            page
          );

          return this.http.get<any>(
            `${this.apiUrl}/tontines/collections?page=${page}&size=${options.batchSize}`,
            { headers }
          ).pipe(
            catchError(error => {
              const syncError = this.createSyncError(
                SyncErrorType.NETWORK,
                `Erreur réseau lors de la récupération de la page ${page}: ${error.message}`,
                context,
                true
              );
              result.errors.push(syncError);
              this.log.log(`SequentialSyncManager: Network error on collections page ${page}: ${error.message}`);
              return throwError(() => syncError);
            }),
            switchMap(response => {
              const pageData = response.data;
              const collections = pageData.content || [];
              const currentPage = pageData.page.number || 0;
              const totalPages = pageData.page.totalPages || 1;
              const totalElements = pageData.page.totalElements || 0;

              // Mise à jour des métadonnées du résultat
              if (result.totalPages === 0) {
                result.totalPages = totalPages;
                result.totalItems = totalElements;
              }

              this.log.log(
                `SequentialSyncManager: Processing collections page ${currentPage + 1}/${totalPages} - ${collections.length} collections`
              );

              if (collections.length === 0) {
                return EMPTY;
              }

              // Mapper les collections
              const mappedCollections = collections.map((c: any) => ({
                id: c.id,
                tontineMemberId: c.tontineMemberId || c.tontineMember?.id || c.member?.id,
                amount: c.amount,
                collectionDate: c.collectionDate,
                commercialUsername: options.commercialUsername,
                isLocal: false,
                isSync: true
              }));

              // Sauvegarder les collections
              return from(this.dbService.saveTontineCollections(mappedCollections)).pipe(
                map(() => {
                  result.processedPages++;
                  result.savedItems += mappedCollections.length;
                  
                  this.log.log(
                    `SequentialSyncManager: Saved collections page ${currentPage + 1}/${totalPages} - ${mappedCollections.length} collections`
                  );

                  // Exigence 2.3: S'arrêter à la dernière page
                  return {
                    currentPage,
                    totalPages,
                    hasMore: currentPage < totalPages - 1
                  };
                }),
                catchError(error => {
                  const syncError = this.createSyncError(
                    SyncErrorType.DATABASE,
                    `Erreur de base de données lors de la sauvegarde de la page ${page}: ${error.message}`,
                    context,
                    false
                  );
                  result.errors.push(syncError);
                  this.log.log(`SequentialSyncManager: Database error on collections page ${page}: ${error.message}`);
                  return throwError(() => syncError);
                })
              );
            })
          );
        };

        // Exigence 2.1 et 2.2: Traitement séquentiel avec expand
        return fetchPage(0).pipe(
          expand(pageInfo => 
            pageInfo.hasMore ? fetchPage(pageInfo.currentPage + 1) : EMPTY
          ),
          reduce(() => result, result)
        );
      }),
      tap(() => {
        this.collectionsSyncLock = false;
        this.log.log(
          `SequentialSyncManager: Collections sync completed - ${result.savedItems}/${result.totalItems} items saved, ${result.errors.length} errors`
        );
      }),
      catchError(error => {
        this.collectionsSyncLock = false;
        this.log.log(`SequentialSyncManager: Collections sync failed: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Synchronise les stocks de manière séquentielle
   * 
   * Exigences: 2.1, 2.2, 2.3, 5.3
   */
  syncStocks(sessionId: string, options: SyncOptions): Observable<StocksSyncResult> {
    // Exigence 2.4: Empêcher les synchronisations concurrentes
    if (this.stocksSyncLock) {
      const error = this.createSyncError(
        SyncErrorType.VALIDATION,
        'Une synchronisation des stocks est déjà en cours',
        this.createErrorContext(sessionId, options.commercialUsername, 'syncStocks'),
        false
      );
      
      return throwError(() => error);
    }

    this.stocksSyncLock = true;
    this.log.log(`SequentialSyncManager: Starting stocks sync for session ${sessionId}`);

    const result: StocksSyncResult = {
      sessionId,
      totalPages: 0,
      processedPages: 0,
      totalItems: 0,
      savedItems: 0,
      errors: []
    };

    return this.getHeaders().pipe(
      switchMap(headers => {
        // Note: L'API stocks actuelle ne semble pas supporter la pagination
        // On traite donc comme une seule page
        const context = this.createErrorContext(
          sessionId,
          options.commercialUsername,
          'fetchStocks',
          0
        );

        return this.http.get<any>(`${this.apiUrl}/tontines/stock`, { headers }).pipe(
          catchError(error => {
            const syncError = this.createSyncError(
              SyncErrorType.NETWORK,
              `Erreur réseau lors de la récupération des stocks: ${error.message}`,
              context,
              true
            );
            result.errors.push(syncError);
            this.log.log(`SequentialSyncManager: Network error on stocks: ${error.message}`);
            return throwError(() => syncError);
          }),
          switchMap(response => {
            const stocks = response.data?.content || [];

            if (!Array.isArray(stocks)) {
              this.log.log('SequentialSyncManager: No stocks data or invalid format');
              result.totalPages = 1;
              result.processedPages = 1;
              return from([result]);
            }

            result.totalPages = 1;
            result.totalItems = stocks.length;

            this.log.log(`SequentialSyncManager: Processing ${stocks.length} stocks`);

            if (stocks.length === 0) {
              result.processedPages = 1;
              return from([result]);
            }

            // Mapper les stocks
            const mappedStocks = stocks.map((s: any) => ({
              id: s.id?.toString() || this.generateUuid(),
              commercial: s.commercial || options.commercialUsername,
              creditId: s.creditId?.toString(),
              articleId: s.articleId?.toString(),
              articleName: s.articleName,
              unitPrice: s.unitPrice || 0,
              totalQuantity: s.totalQuantity || 0,
              availableQuantity: s.availableQuantity || 0,
              distributedQuantity: s.distributedQuantity || 0,
              year: s.year,
              tontineSessionId: s.tontineSessionId?.toString() || sessionId
            }));

            // Sauvegarder les stocks
            return from(this.dbService.saveTontineStocks(mappedStocks)).pipe(
              map(() => {
                result.processedPages = 1;
                result.savedItems = mappedStocks.length;
                
                this.log.log(
                  `SequentialSyncManager: Saved ${mappedStocks.length} stocks`
                );

                return result;
              }),
              catchError(error => {
                const syncError = this.createSyncError(
                  SyncErrorType.DATABASE,
                  `Erreur de base de données lors de la sauvegarde des stocks: ${error.message}`,
                  context,
                  false
                );
                result.errors.push(syncError);
                this.log.log(`SequentialSyncManager: Database error on stocks: ${error.message}`);
                return throwError(() => syncError);
              })
            );
          })
        );
      }),
      tap(() => {
        this.stocksSyncLock = false;
        this.log.log(
          `SequentialSyncManager: Stocks sync completed - ${result.savedItems}/${result.totalItems} items saved, ${result.errors.length} errors`
        );
      }),
      catchError(error => {
        this.stocksSyncLock = false;
        this.log.log(`SequentialSyncManager: Stocks sync failed: ${error.message}`);
        return throwError(() => error);
      })
    );
  }

  /**
   * Génère un UUID v4
   */
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
