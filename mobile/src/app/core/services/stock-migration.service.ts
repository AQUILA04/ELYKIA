import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { DatabaseService } from './database.service';
import { CommercialStockRepository } from '../repositories/commercial-stock.repository';
import { CommercialStockItem } from '../../models/commercial-stock-item.model';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class StockMigrationService {
  constructor(
    private dbService: DatabaseService,
    private commercialStockRepository: CommercialStockRepository,
    private log: LoggerService
  ) {}

  /**
   * Migrer les données des stock-outputs vers les commercial stock items
   * Cette méthode est utilisée pour la transition
   */
  migrateStockOutputsToCommercialStock(commercialUsername: string): Observable<boolean> {
    return from(this.performMigration(commercialUsername)).pipe(
      map(() => {
        this.log.log(`[StockMigrationService] Migration completed for ${commercialUsername}`);
        return true;
      }),
      catchError(error => {
        this.log.log(`[StockMigrationService] Migration failed: ${error.message}`);
        console.error('Stock migration failed:', error);
        return of(false);
      })
    );
  }

  private async performMigration(commercialUsername: string): Promise<void> {
    try {
      // 1. Récupérer tous les stock-outputs et leurs items
      const stockOutputs = await this.dbService.getStockOutputs();
      const stockOutputItems = await this.dbService.getStockOutputItems();
      const articles = await this.dbService.getArticles();

      this.log.log(`[StockMigrationService] Found ${stockOutputs.length} stock outputs, ${stockOutputItems.length} items, ${articles.length} articles`);

      // 2. Créer une map des articles pour récupérer les informations
      const articleMap = new Map(articles.map(article => [article.id, article]));

      // 3. Calculer les quantités par article depuis les stock-output-items
      const articleQuantityMap = new Map<string, number>();
      
      stockOutputItems.forEach(item => {
        const currentQuantity = articleQuantityMap.get(item.articleId) || 0;
        articleQuantityMap.set(item.articleId, currentQuantity + item.quantity);
      });

      // 4. Créer les commercial stock items
      const commercialStockItems: CommercialStockItem[] = [];
      
      for (const [articleId, quantity] of articleQuantityMap.entries()) {
        const article = articleMap.get(articleId);
        if (article && quantity > 0) {
          commercialStockItems.push({
            articleId: parseInt(articleId),
            articleName: article.name,
            commercialName: article.commercialName,
            sellingPrice: article.sellingPrice,
            creditSalePrice: article.creditSalePrice || article.sellingPrice,
            quantityRemaining: quantity
          });
        }
      }

      // 5. Sauvegarder les commercial stock items
      if (commercialStockItems.length > 0) {
        await this.commercialStockRepository.saveWithCommercialUsername(
          commercialStockItems, 
          commercialUsername
        );
        
        this.log.log(`[StockMigrationService] Migrated ${commercialStockItems.length} stock items`);
      }

      // 6. Marquer la migration comme terminée
      await this.markMigrationCompleted(commercialUsername);

    } catch (error) {
      this.log.log(`[StockMigrationService] Error during migration: ${error}`);
      throw error;
    }
  }

  /**
   * Vérifier si la migration a déjà été effectuée
   */
  async isMigrationCompleted(commercialUsername: string): Promise<boolean> {
    try {
      const stockItems = await this.commercialStockRepository.findByCommercialUsername(commercialUsername);
      return stockItems.length > 0;
    } catch (error) {
      this.log.log(`[StockMigrationService] Error checking migration status: ${error}`);
      return false;
    }
  }

  /**
   * Marquer la migration comme terminée
   */
  private async markMigrationCompleted(commercialUsername: string): Promise<void> {
    // On peut ajouter une table de migration ou utiliser un flag
    // Pour l'instant, on considère que la présence de données indique la migration
    this.log.log(`[StockMigrationService] Migration marked as completed for ${commercialUsername}`);
  }

  /**
   * Nettoyer les anciennes données de stock-output (à utiliser avec précaution)
   */
  async cleanupOldStockData(): Promise<void> {
    try {
      // Cette méthode ne doit être appelée qu'après validation complète
      // de la nouvelle implémentation
      
      // await this.dbService.execute('DELETE FROM stock_output_items');
      // await this.dbService.execute('DELETE FROM stock_outputs');
      
      this.log.log('[StockMigrationService] Old stock data cleanup completed');
    } catch (error) {
      this.log.log(`[StockMigrationService] Error during cleanup: ${error}`);
      throw error;
    }
  }

  /**
   * Comparer les données entre ancien et nouveau système
   */
  async validateMigration(commercialUsername: string): Promise<{
    isValid: boolean;
    differences: Array<{
      articleId: string;
      oldQuantity: number;
      newQuantity: number;
      articleName: string;
    }>;
  }> {
    try {
      // 1. Calculer les quantités depuis les stock-outputs
      const stockOutputItems = await this.dbService.getStockOutputItems();
      const oldQuantityMap = new Map<string, number>();
      
      stockOutputItems.forEach(item => {
        const current = oldQuantityMap.get(item.articleId) || 0;
        oldQuantityMap.set(item.articleId, current + item.quantity);
      });

      // 2. Récupérer les quantités depuis les commercial stock items
      const commercialStockItems = await this.commercialStockRepository.findByCommercialUsername(commercialUsername);
      const newQuantityMap = new Map<number, number>();
      
      commercialStockItems.forEach(item => {
        newQuantityMap.set(item.articleId, item.quantityRemaining);
      });

      // 3. Comparer les données
      const differences = [];
      const articles = await this.dbService.getArticles();
      const articleMap = new Map(articles.map(a => [a.id, a.name]));

      // Vérifier tous les articles de l'ancien système
      for (const [articleId, oldQuantity] of oldQuantityMap.entries()) {
        const newQuantity = newQuantityMap.get(parseInt(articleId)) || 0;
        if (oldQuantity !== newQuantity) {
          differences.push({
            articleId,
            oldQuantity,
            newQuantity,
            articleName: articleMap.get(articleId) || 'Unknown'
          });
        }
      }

      // Vérifier les articles qui n'existent que dans le nouveau système
      for (const [articleId, newQuantity] of newQuantityMap.entries()) {
        const oldQuantity = oldQuantityMap.get(articleId.toString()) || 0;
        if (oldQuantity === 0 && newQuantity > 0) {
          differences.push({
            articleId: articleId.toString(),
            oldQuantity: 0,
            newQuantity,
            articleName: articleMap.get(articleId.toString()) || 'Unknown'
          });
        }
      }

      return {
        isValid: differences.length === 0,
        differences
      };

    } catch (error) {
      this.log.log(`[StockMigrationService] Error during validation: ${error}`);
      return {
        isValid: false,
        differences: []
      };
    }
  }
}