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

interface CreateDistributionData {
  clientId: string;
  articles: Array<{ articleId: string; quantity: number }>;
  totalAmount: number;
  dailyPayment: number;
  advance?: number;
  paidAmount?: number;
  remainingAmount?: number;
  client?: any;
  creditId: string;
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
    private healthCheckService: HealthCheckService
  ) {
    this.store.select(selectAuthUser).subscribe(user => {
      this.commercialUsername = user?.username;
    });
  }


  initializeDistributions(): Observable<boolean> {
    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          console.log('DistributionService: Backend online, starting sync...');
          return this.fetchAndSaveDistributions().pipe(
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
    return from(this.dbService.getDistributions(this.commercialUsername)).pipe(
      map(distributions => {
        return distributions;
      }),
      catchError(error => {
        console.error('Failed to load distributions from local database:', error);
        return of([]);
      })
    );
  }

  // Get distributions by commercial username from local database
  getDistributionsByCommercialUsername(username: string): Observable<Distribution[]> {
    return from(this.dbService.getDistributions(username)).pipe(
      catchError(error => {
        console.error('Failed to get distributions by commercial username:', error);
        return of([]);
      })
    );
  }





  // Get distribution items by distribution ID from local database
  getDistributionItems(distributionId: string): Observable<DistributionItem[]> {
    return from(this.dbService.getItemsForDistribution(distributionId)).pipe(
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
    return from(this.dbService.getArticles()).pipe(
      map(articles => {
        // Filter only articles with stock > 0
        return articles.filter(article => article.stockQuantity > 0);
      }),
      catchError(error => {
        console.error('Failed to load articles from local database:', error);
        return of([]);
      })
    );
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
    const now = new Date().toISOString();
    // const allDistributions = await this.dbService.getDistributions(this.commercialUsername);
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

    // Save the main distribution record first
    await this.dbService.saveDistributions([distribution]);

    // Now, create and save the distribution items
    const allArticles = await this.dbService.getArticles();
    const distributionItems: DistributionItem[] = distributionData.articles.map(item => {
      const articleDetails = allArticles.find(a => a.id === item.articleId);
      const unitPrice = articleDetails?.creditSalePrice || 0;
      return {
        id: `d-item-${distribution.id}-${item.articleId}`,
        distributionId: distribution.id,
        articleId: item.articleId,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: unitPrice * item.quantity
      };
    });

    await this.dbService.saveDistributionItems(distributionItems);
    //distribution.items = distributionItems;

    // Save the main distribution record and its items in a single transaction

    // Create and save the corresponding transaction for the history
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

    // Return the created distribution
    return distribution;
  }

  private async updateArticleStock(articleQuantities: Array<{ articleId: string; quantity: number }>): Promise<void> {
    try {
      const articles = await this.dbService.getArticles();
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
      await this.dbService.saveArticles(updatedArticles);
    } catch (error) {
      console.error('Failed to update article stock:', error);
    }
  }

  // Get distribution by ID from local database with client information
  getDistributionById(distributionId: string): Observable<Distribution | undefined> {
    if (!this.commercialUsername) {
      return of(undefined);
    }
    return from(this.dbService.getDistributions(this.commercialUsername)).pipe(
      switchMap(distributions => {
        const distribution = distributions.find(d => d.id === distributionId);
        if (!distribution) {
          return of(undefined);
        }

        // Enrichir avec les informations du client
        return from(this.dbService.getClients(this.commercialUsername!)).pipe(
          map(clients => {
            const client = clients.find(c => c.id === distribution.clientId);
            return {
              ...distribution,
              client: client
            };
          })
        );
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
    return from(this.dbService.getDistributions(this.commercialUsername)).pipe(
      map(distributions => distributions.filter(d => d.clientId === clientId)),
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
    return from(this.dbService.getDistributions(this.commercialUsername)).pipe(
      map(distributions => distributions.filter(d => d.status === status)),
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
    const distributions = await this.dbService.getDistributions(this.commercialUsername);
    const distributionIndex = distributions.findIndex(d => d.id === distributionId);

    if (distributionIndex === -1) {
      throw new Error('Distribution not found');
    }

    const updatedDistribution = {
      ...distributions[distributionIndex],
      status,
      isSync: false, // Mark as needing sync
      syncDate: new Date().toISOString()
    };

    distributions[distributionIndex] = updatedDistribution;
    await this.dbService.saveDistributions(distributions);

    return updatedDistribution;
  }

  // Mettre à jour les montants d'une distribution
  async updateDistributionAmounts(distributionId: string, paidAmount: number, remainingAmount: number): Promise<Distribution> {
    console.log('[SERVICE] updateDistributionAmounts: Updating', { distributionId, paidAmount, remainingAmount });
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    const distributions = await this.dbService.getDistributions(this.commercialUsername);
    const distributionIndex = distributions.findIndex(d => d.id === distributionId);

    if (distributionIndex === -1) {
      throw new Error('Distribution not found');
    }

    const updatedDistribution = {
      ...distributions[distributionIndex],
      paidAmount,
      remainingAmount,
      isSync: false, // Mark as needing sync
      syncDate: new Date().toISOString()
    };

    distributions[distributionIndex] = updatedDistribution;
    await this.dbService.saveDistributions(distributions);

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
      const distributions = await this.dbService.getDistributions(this.commercialUsername);
      const distributionIndex = distributions.findIndex(d => d.id === distributionData.id);

      if (distributionIndex === -1) {
        throw new Error('Distribution not found');
      }

      const originalDistribution = distributions[distributionIndex];

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

      distributions[distributionIndex] = updatedDistribution;
      await this.dbService.saveDistributions(distributions);

      // Update distribution items
      if (distributionData.articles && distributionData.articles.length > 0) {
        // First, restore stock for original items
        const originalItems = await this.dbService.getItemsForDistribution(distributionData.id);
        await this.restoreArticleStock(originalItems);

        // Delete old items
        const allItems = await this.dbService.getDistributionItems();
        const filteredItems = allItems.filter(item => item.distributionId !== distributionData.id);

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
        const articles = await this.dbService.getArticles();
        newItems.forEach(item => {
          const article = articles.find(a => a.id === item.articleId);
          if (article) {
            item.unitPrice = article.creditSalePrice;
            item.totalPrice = article.creditSalePrice * item.quantity;
          }
        });

        await this.dbService.saveDistributionItems([...filteredItems, ...newItems]);

        // Update stock for new items
        await this.updateArticleStock(distributionData.articles);
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
      const articles = await this.dbService.getArticles();
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

      await this.dbService.saveArticles(updatedArticles);
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
      const distributions = await this.dbService.getDistributions(this.commercialUsername);
      const distributionToDelete = distributions.find(d => d.id === distributionId);

      if (!distributionToDelete) {
        throw new Error('Distribution not found');
      }

      // 2. Get distribution items to restore stock
      const distributionItems = await this.dbService.getDistributionItems();
      const itemsToRestore = distributionItems.filter(item => item.distributionId === distributionId);

      // 3. Restore stock for all articles in the distribution
      if (itemsToRestore.length > 0) {
        console.log(`Restoring stock for ${itemsToRestore.length} items`);
        await this.restoreArticleStock(itemsToRestore);
      }

      // 4. Delete distribution items
      const filteredItems = distributionItems.filter(item => item.distributionId !== distributionId);
      await this.dbService.saveDistributionItems(filteredItems);

      // 5. Delete the distribution itself
      const filteredDistributions = distributions.filter(d => d.id !== distributionId);
      await this.dbService.saveDistributions(filteredDistributions);

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
    const distributions = await this.dbService.getDistributions(this.commercialUsername);
    const updatedDistributions = distributions.filter(d => !distributionIds.includes(d.id));
    await this.dbService.saveDistributions(updatedDistributions);

    const distributionItems = await this.dbService.getDistributionItems();
    const updatedItems = distributionItems.filter(item => !distributionIds.includes(item.distributionId));
    await this.dbService.saveDistributionItems(updatedItems);
  }

  // Get pending distributions (for sync)
  getPendingDistributions(): Observable<Distribution[]> {
    if (!this.commercialUsername) {
      return of([]);
    }
    return from(this.dbService.getDistributions(this.commercialUsername)).pipe(
      map(distributions => distributions.filter(d => !d.isSync && d.isLocal)),
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
      const distributions = await this.dbService.getDistributions(this.commercialUsername);
      const distributionIndex = distributions.findIndex(d => d.id === distributionId);

      if (distributionIndex === -1) {
        return false;
      }

      distributions[distributionIndex] = {
        ...distributions[distributionIndex],
        isSync: true,
        syncDate: new Date().toISOString()
      };

      await this.dbService.saveDistributions(distributions);
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
    return from(this.dbService.getDistributions(this.commercialUsername)).pipe(
      map(distributions => {
        const total = distributions.length;
        const active = distributions.filter(d => d.status === 'INPROGRESS' || d.status === 'ACTIVE').length;
        const completed = distributions.filter(d => d.status === 'COMPLETED').length;
        const overdue = distributions.filter(d => d.status === 'OVERDUE').length;
        const totalAmount = distributions.reduce((sum, d) => sum + d.totalAmount, 0);
        const pendingSync = distributions.filter(d => !d.isSync && d.isLocal).length;

        return {
          total,
          active,
          completed,
          overdue,
          totalAmount,
          pendingSync
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

  // private async saveDistributionLocally(distribution: Distribution): Promise<void> {
  //   try {
  //     await this.dbService.saveDistributions([distribution]);
  //     await this.dbService.addTransaction({
  //       id: `trans-${distribution.id}`,
  //       clientId: distribution.clientId,
  //       referenceId: distribution.id,
  //       type: 'distribution',
  //       amount: distribution.totalAmount,
  //       details: `Distribution de ${distribution.articles?.length} article(s)`,
  //       date: distribution.createdAt,
  //       isSync: false
  //     });
  //     console.log('Saving distribution and transaction locally:', distribution.reference);
  //   } catch (error) {
  //     console.error('Failed to save distribution locally:', error);
  //   }
  // }
}

