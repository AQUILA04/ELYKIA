import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, forkJoin } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { Distribution } from '../../models/distribution.model';
import { Article } from '../../models/article.model';
import { ApiResponse } from '../../models/api-response.model';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { DistributionItem } from '../../models/distribution-item.model';
import { HealthCheckService } from './health-check.service';
import * as DistributionActions from '../../store/distribution/distribution.actions';
import { DistributionMapper } from '../../shared/mapper/distribution.mapper';
import { CommercialStockRepository } from '../repositories/commercial-stock.repository';
import { DistributionRepositoryExtensions, DistributionRepositoryFilters } from '../repositories/distribution.repository.extensions';
import { DistributionRepository } from '../repositories/distribution.repository';
import { ArticleRepository } from '../repositories/article.repository';
import { StockSnapshotRepository } from '../repositories/stock-snapshot.repository';

interface CreateDistributionData {
  clientId: string;
  articles: Array<{ articleId: string; quantity: number }>;
  totalAmount: number;
  dailyPayment: number;
  advance?: number;
  paidAmount?: number;
  remainingAmount?: number;
  client?: any;
  creditId?: string; // Made optional
  type?: string; // 'CLIENT' ou 'COMMERCIAL'
}

@Injectable({
  providedIn: 'root'
})
export class DistributionService {
  private commercialUsername: string | undefined;

  constructor(private http: HttpClient,
    private dbService: DatabaseService,
    private store: Store,
    private healthCheckService: HealthCheckService,
    private commercialStockRepository: CommercialStockRepository,
    private distributionRepositoryExtensions: DistributionRepositoryExtensions,
    private distributionRepository: DistributionRepository,
    private articleRepository: ArticleRepository,
    private stockSnapshotRepository: StockSnapshotRepository
  ) {
    this.store.select(selectAuthUser).subscribe(user => {
      this.commercialUsername = user?.username;
    });
  }

  // ... (existing code)

  /**
   * Get paginated distributions (Native Views)
   *
   * @param page Page number
   * @param size Page size
   * @param filters Optional filters
   * @returns Page of DistributionView
   */
  getDistributionsPaginated(
    page: number,
    size: number,
    filters?: any
  ): Observable<any> {
    if (!this.commercialUsername) {
      return of({ content: [], totalElements: 0, totalPages: 0, page, size });
    }
    return from(this.distributionRepositoryExtensions.findViewsByCommercialPaginated(
      this.commercialUsername,
      page,
      size,
      filters
    )).pipe(
      catchError(error => {
        console.error('Failed to load paginated distributions:', error);
        return of({ content: [], totalElements: 0, totalPages: 0, page, size });
      })
    );
  }


  initializeDistributions(): Observable<boolean> {
    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          console.log('DistributionService: Backend online, starting sync...');
          const deleteSynced$ = this.commercialUsername
            ? from(this.distributionRepository.deleteSyncedDistributions(this.commercialUsername))
            : of(void 0);

          return deleteSynced$.pipe(
            switchMap(() => this.fetchAndSaveDistributions()),
            map(() => true),
            catchError((error) => {
              console.error('Failed to fetch distributions from API, usage local data', error);
              return of(true);
            })
          );
        } else {
          console.log('DistributionService: Backend offline, skipping sync.');
          return of(true);
        }
      }),
      tap(() => {
        if (this.commercialUsername) {
          this.store.dispatch(DistributionActions.loadFirstPageDistributions({
            commercialUsername: this.commercialUsername
          }));
        }
      }),
      catchError(err => {
        console.error('Distribution initialization failed:', err);
        return of(false);
      })
    );
  }

  fetchAndSaveDistributions(page: number = 0, size: number = 100, seenKeys: Set<string> = new Set()): Observable<any> {
    if (!this.commercialUsername) {
      return of(null);
    }
    console.log(`DistributionService: Fetching distributions page ${page}...`);
    const url = `${environment.apiUrl}/api/v1/credits/by-commercial/${this.commercialUsername}?page=${page}&size=${size}&sort=id,desc`;
    return this.http.get<ApiResponse<any>>(url).pipe(
      switchMap(response => {
        const pageData = response.data;
        const distributions = pageData.content || [];
        const currentPage = pageData.page?.number || 0;
        const totalPages = pageData.page?.totalPages || 1;
        const totalElements = pageData.page?.totalElements || 0;

        console.log(`DistributionService: Page ${currentPage + 1}/${totalPages} - ${distributions.length} distributions found (Total: ${totalElements})`);

        if (distributions.length === 0) {
          return of(null);
        }

        const uniqueDistributions = this.filterUniqueDistributions(distributions, seenKeys);

        console.log(`DistributionService: Saving ${uniqueDistributions.length} unique distributions from page ${currentPage + 1}...`);

        // Use Repository to save
        return from(this.dbService.saveDistributionsAndItems(uniqueDistributions)).pipe(
          tap(() => console.log(`DistributionService: Page ${currentPage + 1} saved successfully.`)),
          switchMap(() => {
            if (currentPage < totalPages - 1) {
              return this.fetchAndSaveDistributions(currentPage + 1, size, seenKeys);
            } else {
              console.log('DistributionService: All pages fetched and saved.');
              return of(null);
            }
          }),
          catchError(err => {
            console.error(`DistributionService: Error saving page ${currentPage + 1}:`, err);
            throw err;
          })
        );
      })
    );
  }

  private filterUniqueDistributions(distributions: Distribution[], seen: Set<string>): Distribution[] {
    return distributions.filter(dist => {
      const key = `${dist.clientId}-${dist.totalAmount}-${dist.dailyPayment}-${dist.startDate}`;
      if (seen.has(key)) {
        return false;
      } else {
        seen.add(key);
        return true;
      }
    });
  }

  // Get distributions from local database only
  getDistributions(): Observable<Distribution[]> {
    if (!this.commercialUsername) {
      return of([]); // Or throw an error, depending on desired behavior
    }
    console.warn('DistributionService.getDistributions() is deprecated and returns empty array. Use getDistributionsPaginated() instead.');
    return of([]);
  }

  /**
   * @deprecated Use pagination instead
   */
  getDistributionsByCommercialUsername(username: string): Observable<Distribution[]> {
    if (!username) return of([]);
    console.warn('DistributionService.getDistributionsByCommercialUsername() is deprecated and returns empty array. Use getDistributionsPaginated() instead.');
    return of([]);
  }

  // Get distribution items by distribution ID from local database
  getDistributionItems(distributionId: string): Observable<DistributionItem[]> {
    return from(this.distributionRepository.getItemsForDistribution(distributionId)).pipe(
      map(items => {
        return items;
      }),
      catchError(error => {
        console.error(`Failed to get items for distribution ${distributionId}:`, error);
        return of([]);
      })
    );
  }

  // Get available articles from local database only
  getAvailableArticles(): Observable<Article[]> {
    return from(this.articleRepository.findAll()).pipe(
      map(articles => {
        // Filter only articles with stock > 0
        // NOTE: This logic might need to be updated to check CommercialStockItems instead of article.stockQuantity
        // if article.stockQuantity is not kept in sync with CommercialStockItems.
        // For now, assuming article.stockQuantity is updated via DataInitializationService or similar.
        return articles; // Removed filter to allow all articles, filtering will be done in component based on CommercialStock
      }),
      catchError(error => {
        console.error('Failed to load articles from local database:', error);
        return of([]);
      })
    );
  }

  getAvailableArticlesPaginated(page: number, size: number, filters?: { searchQuery?: string }): Observable<any> {
    if (!this.commercialUsername) {
      return of({ content: [], totalElements: 0, totalPages: 0 });
    }
    return from(this.commercialStockRepository.findAvailableArticlesPaginated(
      this.commercialUsername,
      page,
      size,
      filters
    ));
  }

  // Create a new distribution - save to local database only
  createDistribution(distributionData: CreateDistributionData): Observable<Distribution> {
    return from(this.createLocalDistribution(distributionData)).pipe(
      map(distribution => {
        return distribution;
      }),
      catchError(error => {
        console.error('Failed to create distribution locally:', error);
        throw error;
      })
    );
  }

  private async createLocalDistribution(distributionData: CreateDistributionData): Promise<Distribution> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    if (distributionData.articles.length < 1) {
      throw new Error(`Aucun items pour la distribution`);
    }
    const now = new Date().toISOString();

    // const newCount = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
    const newCount = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');

    const commercialCode = this.commercialUsername?.slice(-3).toUpperCase() || 'XXX';
    const reference = `DIST-${commercialCode}-${newCount}`;

    const distribution: Distribution = {
      id: `local-${Date.now()}`,
      reference,
      creditId: distributionData.creditId,
      totalAmount: distributionData.totalAmount,
      dailyPayment: distributionData.dailyPayment,
      advance: distributionData.advance || 0,
      paidAmount: distributionData.paidAmount || 0,
      remainingAmount: distributionData.remainingAmount || distributionData.totalAmount,
      startDate: now,
      endDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString(), // 30 days later
      status: 'INPROGRESS',
      clientId: distributionData.clientId,
      commercialId: this.commercialUsername || 'unknown',
      isLocal: true,
      isSync: false,
      syncDate: '',
      createdAt: now,
      client: distributionData.client,
      articleCount: distributionData.articles.length, // This will be populated by the items
      syncHash: ''
    };

    // --- STOCK VALIDATION START ---
    // Verify strict stock availability before proceeding
    // Fetch needed articles just in case we need their names for error messages
    const articleIds = distributionData.articles.map(a => a.articleId);
    const neededArticles = await this.articleRepository.findByIds(articleIds);

    const stockItemsCache = new Map<string, any>();

    for (const item of distributionData.articles) {
      const stockItem = await this.commercialStockRepository.getStockItem(item.articleId, this.commercialUsername);
      const currentStock = stockItem ? stockItem.quantityRemaining : 0;
      if (currentStock < item.quantity) {
        const article = neededArticles.find(a => a.id === item.articleId);
        const articleName = article ? article.name : `Article ${item.articleId}`;
        throw new Error(`Stock insuffisant pour ${articleName}. Disponible: ${currentStock}, Demandé: ${item.quantity}`);
      }
      if (stockItem) {
          stockItemsCache.set(item.articleId, stockItem);
      }
    }

    // Now, create the distribution items and calculate total amount
    let calculatedTotalAmount = 0;
    const distributionItems: DistributionItem[] = distributionData.articles.map(item => {
      const stockItem = stockItemsCache.get(item.articleId);
      const unitPrice = stockItem?.unitPrice || 0;
      const totalPrice = unitPrice * item.quantity;
      calculatedTotalAmount += totalPrice;
      return {
        id: `d-item-${distribution.id}-${item.articleId}`,
        distributionId: distribution.id,
        articleId: item.articleId,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice
      };
    });

    distribution.items = distributionItems;
    
    // Update distribution monetary values based on calculated local pricing
    distribution.totalAmount = calculatedTotalAmount;
    if (distributionData.advance !== undefined) {
      distribution.paidAmount = distributionData.advance;
      distribution.remainingAmount = calculatedTotalAmount - distributionData.advance;
    } else {
      distribution.remainingAmount = calculatedTotalAmount;
    }

    // --- SNAPSHOT VALIDATION START ---
    // Vérifier que le commercial ne dépasse pas son stock reçu lors de la dernière initialisation.
    // Cela protège contre le cas où des distributions locales non synchronisées coexistent avec
    // un rechargement du stock serveur (qui ne tient pas compte des ventes non encore validées).
    const newDistributionTotal = calculatedTotalAmount;
    const snapshotCheck = await this.stockSnapshotRepository.canDistribute(
      this.commercialUsername,
      newDistributionTotal
    );
    if (!snapshotCheck.allowed) {
      throw new Error(
        `Stock épuisé. Le montant total du stock octroyé par le bureau est de ${snapshotCheck.stockAtInit} et ` +
        `vous avez déjà vendu ${snapshotCheck.localSalesTotal} en local (non synchronisé). ` +
        `Il vous reste l'équivalent de ${snapshotCheck.available} disponible. ` +
        `Veuillez synchroniser vos données avec le serveur de toute urgence.`
      );
    }
    // --- SNAPSHOT VALIDATION END ---

    if (distribution.items.length < 1) {
      throw new Error(`Aucun items pour la distribution`);
    }

    // Persistance atomique : distribution + items dans un seul executeSet (une seule transaction SQLite).
    // Si l'insertion des items échoue, la distribution n'est pas non plus persistée (rollback implicite).
    // saveDistributionsAndItems utilise DistributionMapper.toLocal qui lit maintenant distribution.items
    // en priorité (Fix 4 — DistributionMapper), garantissant que les items locaux sont bien inclus.
    await this.dbService.saveDistributionsAndItems([distribution]);

    // Create and save the corresponding transaction for the history
    // Still using dbService for transactions
    await this.dbService.addTransaction({
      id: `trans-${distribution.id}`,
      clientId: distribution.clientId,
      referenceId: distribution.reference,
      type: 'DISTRIBUTION',
      amount: distribution.totalAmount,
      details: `Distribution de ${distributionData.articles.length} article(s) à ${distributionData.client?.fullName || 'client inconnu'}`,
      date: distribution.createdAt,
      isSync: false,
      isLocal: true
    });

    // Update the stock for each article
    await this.updateArticleStock(distributionData.articles);

    // --- SNAPSHOT INCREMENT ---
    // Incrémenter le cumul des ventes locales dans le snapshot.
    // Fait après la persistance réussie pour garantir la cohérence.
    try {
      await this.stockSnapshotRepository.incrementLocalSales(
        this.commercialUsername,
        newDistributionTotal
      );
    } catch (snapshotError) {
      // L'incrément du snapshot est non-bloquant : la distribution est déjà persistée.
      // On log l'erreur mais on ne fait pas échouer la distribution.
      console.warn('[DistributionService] Failed to increment stock snapshot (non-blocking):', snapshotError);
    }
    // --- SNAPSHOT INCREMENT END ---

    // Return the created distribution
    return distribution;
  }

  private async updateArticleStock(articleQuantities: Array<{ articleId: string; quantity: number }>): Promise<void> {
    try {
      // Update CommercialStockItems
      if (this.commercialUsername) {
        for (const item of articleQuantities) {
          await this.commercialStockRepository.updateStockQuantity(item.articleId, this.commercialUsername, -item.quantity);
        }
      }

      // Also update legacy article stock for compatibility if needed
      // OPTIMIZATION: Fetch only needed articles
      const articleIds = articleQuantities.map(a => a.articleId);
      const articles = await this.articleRepository.findByIds(articleIds);

      const updatedArticles = articles.map(article => {
        const usedQuantity = articleQuantities.find(aq => aq.articleId === article.id);
        if (usedQuantity) {
          return {
            ...article,
            stockQuantity: Math.max(0, article.stockQuantity - usedQuantity.quantity),
            lastUpdate: new Date().toISOString(),
            isSync: false // Mark as needing sync
          };
        }
        return article;
      });

      // Save updated articles back to local database
      await this.articleRepository.saveAll(updatedArticles);
    } catch (error) {
      console.error('Failed to update article stock:', error);
    }
  }

  // Get distribution by ID from local database with client information
  getDistributionById(distributionId: string): Observable<Distribution | undefined> {
    if (!this.commercialUsername) {
      return of(undefined);
    }
    return from(this.distributionRepository.findById(distributionId)).pipe(
      switchMap(async (distribution) => {
        if (!distribution) {
          return undefined;
        }

        // Enrichir avec les informations du client
        // Use ClientRepository instead of dbService.getClients
        // But we don't have ClientRepository injected.
        // We can use dbService.getClientById which is efficient if it uses WHERE id = ?
        // Or inject ClientRepository.
        // For now, let's use dbService.getClientById as it is efficient.
        try {
            const client = await this.dbService.getClientById(distribution.clientId);
            return {
              ...distribution,
              client: client
            };
        } catch (e) {
            return distribution;
        }
      }),
      catchError(error => {
        console.error('Failed to get distribution by ID:', error);
        return of(undefined);
      })
    );
  }

  // Get distributions by client ID from local database
  getDistributionsByClient(clientId: string): Observable<Distribution[]> {
    if (!this.commercialUsername) {
      return of([]);
    }
    // OPTIMIZATION: Use paginated query with filter
    return from(this.distributionRepositoryExtensions.findByCommercialPaginated(
        this.commercialUsername,
        0,
        1000,
        { clientId: clientId }
    )).pipe(
      map(page => page.content),
      catchError(error => {
        console.error('Failed to get distributions by client:', error);
        return of([]);
      })
    );
  }

  // Get distributions by status from local database
  getDistributionsByStatus(status: string): Observable<Distribution[]> {
    if (!this.commercialUsername) {
      return of([]);
    }
    // OPTIMIZATION: Use paginated query with filter
    return from(this.distributionRepositoryExtensions.findByCommercialPaginated(
        this.commercialUsername,
        0,
        1000,
        { status: status }
    )).pipe(
      map(page => page.content),
      catchError(error => {
        console.error('Failed to get distributions by status:', error);
        return of([]);
      })
    );
  }

  // Update distribution status locally
  updateDistributionStatus(distributionId: string, status: string): Observable<Distribution> {
    return from(this.updateDistributionStatusLocally(distributionId, status)).pipe(
      catchError(error => {
        console.error('Failed to update distribution status:', error);
        throw error;
      })
    );
  }

  private async updateDistributionStatusLocally(distributionId: string, status: string): Promise<Distribution> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }

    const distribution = await this.distributionRepository.findById(distributionId);

    if (!distribution) {
      throw new Error('Distribution not found');
    }

    const updatedDistribution = {
      ...distribution,
      status,
      isSync: false, // Mark as needing sync
      syncDate: new Date().toISOString()
    };

    await this.distributionRepository.saveAll([updatedDistribution]);

    return updatedDistribution;
  }

  // Mettre à jour les montants d'une distribution
  async updateDistributionAmounts(distributionId: string, paidAmount: number, remainingAmount: number): Promise<Distribution> {
    console.log('[SERVICE] updateDistributionAmounts: Updating', { distributionId, paidAmount, remainingAmount });
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }

    const distribution = await this.distributionRepository.findById(distributionId);

    if (!distribution) {
      throw new Error('Distribution not found');
    }

    const updatedDistribution = {
      ...distribution,
      paidAmount,
      remainingAmount,
      isSync: false, // Mark as needing sync
      syncDate: new Date().toISOString()
    };

    await this.distributionRepository.saveAll([updatedDistribution]);

    return updatedDistribution;
  }

  // Update distribution locally
  updateDistribution(distributionData: any): Observable<Distribution> {
    return from(this.updateDistributionLocally(distributionData)).pipe(
      catchError(error => {
        console.error('Failed to update distribution:', error);
        throw error;
      })
    );
  }

  private async updateDistributionLocally(distributionData: any): Promise<Distribution> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    try {
      const originalDistribution = await this.distributionRepository.findById(distributionData.id);

      if (!originalDistribution) {
        throw new Error('Distribution not found');
      }

      // Calculate new values
      const dailyPayment = distributionData.dailyPayment || 0;
      const paymentPeriod = distributionData.paymentPeriod || 30;
      const startDate = new Date(distributionData.startDate || originalDistribution.startDate);
      const endDate = new Date(distributionData.endDate || originalDistribution.endDate);

      // Update the distribution
      const updatedDistribution: Distribution = {
        ...originalDistribution,
        totalAmount: distributionData.totalAmount,
        advance: distributionData.advance,
        paidAmount: distributionData.advance, // Reset paid amount to advance
        remainingAmount: distributionData.remainingAmount,
        dailyPayment: dailyPayment,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isSync: false, // Mark as needing sync
        syncDate: new Date().toISOString()
      };

      // Update distribution items
      if (distributionData.articles && distributionData.articles.length > 0) {
        // First, restore stock for original items
        const originalItems = await this.distributionRepository.getItemsForDistribution(distributionData.id);
        await this.restoreArticleStock(originalItems);

        // Note: saveAll handles update/insert but doesn't delete removed items unless we handle it.
        // DistributionRepository.saveAll deletes items if we pass the distribution with new items.
        // So we just need to construct the new items list.

        // Add new items
        const newItems: DistributionItem[] = distributionData.articles.map((article: any, index: number) => ({
          id: `${distributionData.id}-item-${index + 1}`,
          distributionId: distributionData.id,
          articleId: article.articleId,
          quantity: article.quantity,
          unitPrice: 0, // Will be calculated
          totalPrice: 0, // Will be calculated
          isSync: false,
          isLocal: true
        }));

        // Calculate prices for new items
        // OPTIMIZATION: Fetch only needed articles
        const articleIds = distributionData.articles.map((a: any) => a.articleId);
        const articles = await this.articleRepository.findByIds(articleIds);

        newItems.forEach(item => {
          const article = articles.find(a => a.id === item.articleId);
          if (article) {
            item.unitPrice = article.creditSalePrice;
            item.totalPrice = article.creditSalePrice * item.quantity;
          }
        });

        updatedDistribution.items = newItems;

        // Save updated distribution and items
        await this.distributionRepository.saveAll([updatedDistribution]);

        // Update stock for new items
        await this.updateArticleStock(distributionData.articles);
      } else {
          // Just save the distribution update
          await this.distributionRepository.saveAll([updatedDistribution]);
      }

      // Update transaction
      const transactions = await this.dbService.getTransactions(this.commercialUsername);
      const transactionIndex = transactions.findIndex(t => t.referenceId === originalDistribution.reference);
      if (transactionIndex !== -1) {
        transactions[transactionIndex] = {
          ...transactions[transactionIndex],
          amount: distributionData.totalAmount,
          details: `Distribution modifiée de ${distributionData.articles?.length || 0} article(s) à ${distributionData.client?.fullName || 'client inconnu'}`,
          isSync: false
        };
        // Note: saveTransactions method needs to be implemented in DatabaseService
        // For now, we'll skip updating the transaction
        // await this.dbService.saveTransactions(transactions);
      }

      return updatedDistribution;
    } catch (error) {
      console.error('Failed to update distribution locally:', error);
      throw error;
    }
  }

  private async restoreArticleStock(items: DistributionItem[]): Promise<void> {
    try {
      // Restore CommercialStockItems
      if (this.commercialUsername) {
        for (const item of items) {
          await this.commercialStockRepository.updateStockQuantity(item.articleId, this.commercialUsername, item.quantity);
        }
      }

      // Restore legacy article stock
      // OPTIMIZATION: Fetch only needed articles
      const articleIds = items.map(i => i.articleId);
      const articles = await this.articleRepository.findByIds(articleIds);

      const updatedArticles = articles.map(article => {
        const restoredQuantity = items
          .filter(item => item.articleId === article.id)
          .reduce((sum, item) => sum + item.quantity, 0);

        if (restoredQuantity > 0) {
          return {
            ...article,
            stockQuantity: article.stockQuantity + restoredQuantity,
            lastUpdate: new Date().toISOString(),
            isSync: false
          };
        }
        return article;
      });

      await this.articleRepository.saveAll(updatedArticles);
      console.log('Article stock restored locally');
    } catch (error) {
      console.error('Failed to restore article stock:', error);
    }
  }

  // Delete distribution locally
  deleteDistribution(distributionId: string): Observable<boolean> {
    return from(this.deleteDistributionLocally(distributionId)).pipe(
      catchError(error => {
        console.error('Failed to delete distribution:', error);
        return of(false);
      })
    );
  }

  private async deleteDistributionLocally(distributionId: string): Promise<boolean> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    try {
      console.log(`Starting deletion of distribution: ${distributionId}`);

      // 1. Get distribution
      const distributionToDelete = await this.distributionRepository.findById(distributionId);

      if (!distributionToDelete) {
        throw new Error('Distribution not found');
      }

      // 2. Get distribution items to restore stock
      const itemsToRestore = await this.distributionRepository.getItemsForDistribution(distributionId);

      // 3. Restore stock for all articles in the distribution
      if (itemsToRestore.length > 0) {
        console.log(`Restoring stock for ${itemsToRestore.length} items`);
        await this.restoreArticleStock(itemsToRestore);
      }

      // 4. Delete distribution and items using Repository
      await this.distributionRepository.deleteDistribution(distributionId);

      console.log(`Successfully deleted distribution ${distributionId} and restored stock`);
      return true;
    } catch (error) {
      console.error('Failed to delete distribution locally:', error);
      return false;
    }
  }

  async deleteDistributions(distributionIds: string[]): Promise<void> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    // Loop and delete one by one to handle stock restoration correctly
    for (const id of distributionIds) {
        await this.deleteDistributionLocally(id);
    }
  }

  // Get pending distributions (for sync)
  getPendingDistributions(): Observable<Distribution[]> {
    if (!this.commercialUsername) {
      return of([]);
    }
    // OPTIMIZATION: Use findUnsynced
    return from(this.distributionRepository.findUnsynced(this.commercialUsername, 1000, 0)).pipe(
      catchError(error => {
        console.error('Failed to get pending distributions:', error);
        return of([]);
      })
    );
  }

  // Mark distribution as synced
  markDistributionAsSynced(distributionId: string): Observable<boolean> {
    return from(this.markDistributionAsSyncedLocally(distributionId)).pipe(
      catchError(error => {
        console.error('Failed to mark distribution as synced:', error);
        return of(false);
      })
    );
  }

  private async markDistributionAsSyncedLocally(distributionId: string): Promise<boolean> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    try {
      await this.distributionRepository.updateSyncStatus(distributionId, true);
      return true;
    } catch (error) {
      console.error('Failed to mark distribution as synced:', error);
      return false;
    }
  }

  // Get distribution statistics from local data
  getDistributionStats(): Observable<any> {
    if (!this.commercialUsername) {
      return of({
        total: 0,
        active: 0,
        completed: 0,
        overdue: 0,
        totalAmount: 0,
        pendingSync: 0
      });
    }

    // OPTIMIZATION: Use count queries
    return forkJoin({
        total: from(this.distributionRepositoryExtensions.countByCommercial(this.commercialUsername)),
        active: from(this.distributionRepositoryExtensions.countActiveByCommercial(this.commercialUsername)),
        // completed: from(this.distributionRepositoryExtensions.countByCommercial(this.commercialUsername, { status: 'COMPLETED' })),
        // overdue: from(this.distributionRepositoryExtensions.countByCommercial(this.commercialUsername, { status: 'OVERDUE' })),
        totalAmount: from(this.distributionRepositoryExtensions.getTotalAmountByCommercial(this.commercialUsername)),
        pendingSync: from(this.distributionRepository.countUnsynced()) // Note: countUnsynced in BaseRepository doesn't filter by commercial, might need override
    }).pipe(
      map(stats => {
        return {
          total: stats.total,
          active: stats.active,
          completed: 0, // Not implemented in extensions yet
          overdue: 0, // Not implemented in extensions yet
          totalAmount: stats.totalAmount,
          pendingSync: stats.pendingSync
        };
      }),
      catchError(error => {
        console.error('Failed to get distribution stats:', error);
        return of({
          total: 0,
          active: 0,
          completed: 0,
          overdue: 0,
          totalAmount: 0,
          pendingSync: 0
        });
      })
    );
  }
}
