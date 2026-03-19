import { Injectable } from '@angular/core';
import { DatabaseService } from '../database.service';
import { IDataCleaner, CleanupResult } from '../../models/tontine-sync.models';

/**
 * Service responsable du nettoyage des données tontine avant synchronisation
 * Implémente l'interface IDataCleaner
 */
@Injectable({
  providedIn: 'root'
})
export class DataCleanerService implements IDataCleaner {

  constructor(private databaseService: DatabaseService) {}

  /**
   * Nettoie toutes les données tontine pour un commercial
   * @param commercialUsername Nom d'utilisateur du commercial
   * @returns Promise du résultat de nettoyage avec compteurs
   */
  async cleanTontineData(commercialUsername: string): Promise<CleanupResult> {
    // Validation des paramètres
    if (!commercialUsername || commercialUsername.trim() === '') {
      throw new Error('commercialUsername est requis pour le nettoyage des données');
    }

    try {
      // Récupérer la session tontine pour obtenir le sessionId
      const session = await this.databaseService.getTontineSession();
      const sessionId = session?.id;

      if (!sessionId) {
        throw new Error('Aucune session tontine trouvée pour le nettoyage');
      }

      // Compter les éléments avant suppression
      const membersCount = await this.countMembers(sessionId, commercialUsername);
      const collectionsCount = await this.countCollections(commercialUsername);
      const stocksCount = await this.countStocks(commercialUsername);

      // Nettoyer les données dans l'ordre approprié (enfants avant parents)
      await this.cleanCollections(commercialUsername);
      await this.cleanStocks(commercialUsername);
      await this.cleanMembers(sessionId, commercialUsername);

      return {
        membersDeleted: membersCount,
        collectionsDeleted: collectionsCount,
        stocksDeleted: stocksCount,
        success: true
      };
    } catch (error) {
      console.error('Erreur lors du nettoyage des données tontine:', error);
      throw new Error(`Échec du nettoyage des données tontine: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Nettoie les membres de tontine
   * @param sessionId ID de session tontine
   * @param commercialUsername Nom d'utilisateur du commercial
   */
  async cleanMembers(sessionId: string, commercialUsername: string): Promise<void> {
    // Validation des paramètres
    if (!sessionId || sessionId.trim() === '') {
      throw new Error('sessionId est requis pour le nettoyage des membres');
    }
    if (!commercialUsername || commercialUsername.trim() === '') {
      throw new Error('commercialUsername est requis pour le nettoyage des membres');
    }

    try {
      // Nettoyer d'abord les données dépendantes
      await this.cleanMemberAmountHistory(sessionId, commercialUsername);
      await this.cleanDeliveries(commercialUsername);

      // Supprimer les membres
      const deleteSql = `
        DELETE FROM tontine_members 
        WHERE tontineSessionId = ? AND commercialUsername = ? AND isSync = 1
      `;
      await this.databaseService.execute(deleteSql, [sessionId, commercialUsername]);
    } catch (error) {
      console.error('Erreur lors du nettoyage des membres:', error);
      throw new Error(`Échec du nettoyage des membres: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Nettoie les collections de tontine
   * @param commercialUsername Nom d'utilisateur du commercial
   */
  async cleanCollections(commercialUsername: string): Promise<void> {
    // Validation des paramètres
    if (!commercialUsername || commercialUsername.trim() === '') {
      throw new Error('commercialUsername est requis pour le nettoyage des collections');
    }

    try {
      const deleteSql = `
        DELETE FROM tontine_collections 
        WHERE commercialUsername = ? AND isSync = 1
      `;
      await this.databaseService.execute(deleteSql, [commercialUsername]);
    } catch (error) {
      console.error('Erreur lors du nettoyage des collections:', error);
      throw new Error(`Échec du nettoyage des collections: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Nettoie les stocks de tontine
   * @param commercialUsername Nom d'utilisateur du commercial
   */
  async cleanStocks(commercialUsername: string): Promise<void> {
    // Validation des paramètres
    if (!commercialUsername || commercialUsername.trim() === '') {
      throw new Error('commercialUsername est requis pour le nettoyage des stocks');
    }

    try {
      const deleteSql = `
        DELETE FROM tontine_stocks 
        WHERE commercial = ? AND isSync = 1
      `;
      await this.databaseService.execute(deleteSql, [commercialUsername]);
    } catch (error) {
      console.error('Erreur lors du nettoyage des stocks:', error);
      throw new Error(`Échec du nettoyage des stocks: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Nettoie l'historique des montants des membres
   * @param sessionId ID de session tontine
   * @param commercialUsername Nom d'utilisateur du commercial
   */
  private async cleanMemberAmountHistory(sessionId: string, commercialUsername: string): Promise<void> {
    try {
      const deleteSql = `
        DELETE FROM tontine_member_amount_history 
        WHERE tontineMemberId IN (
          SELECT id FROM tontine_members 
          WHERE tontineSessionId = ? AND commercialUsername = ? AND isSync = 1
        )
      `;
      await this.databaseService.execute(deleteSql, [sessionId, commercialUsername]);
    } catch (error) {
      console.error('Erreur lors du nettoyage de l\'historique des montants:', error);
      throw new Error(`Échec du nettoyage de l'historique des montants: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Nettoie les livraisons de tontine
   * @param commercialUsername Nom d'utilisateur du commercial
   */
  private async cleanDeliveries(commercialUsername: string): Promise<void> {
    try {
      // Nettoyer d'abord les items de livraison
      const deleteItemsSql = `
        DELETE FROM tontine_delivery_items 
        WHERE tontineDeliveryId IN (
          SELECT id FROM tontine_deliveries 
          WHERE commercialUsername = ? AND isSync = 1
        )
      `;
      await this.databaseService.execute(deleteItemsSql, [commercialUsername]);

      // Puis nettoyer les livraisons
      const deleteDeliveriesSql = `
        DELETE FROM tontine_deliveries 
        WHERE commercialUsername = ? AND isSync = 1
      `;
      await this.databaseService.execute(deleteDeliveriesSql, [commercialUsername]);
    } catch (error) {
      console.error('Erreur lors du nettoyage des livraisons:', error);
      throw new Error(`Échec du nettoyage des livraisons: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Compte le nombre de membres à supprimer
   * @param sessionId ID de session tontine
   * @param commercialUsername Nom d'utilisateur du commercial
   * @returns Nombre de membres
   */
  private async countMembers(sessionId: string, commercialUsername: string): Promise<number> {
    try {
      const countSql = `
        SELECT COUNT(*) as count 
        FROM tontine_members 
        WHERE tontineSessionId = ? AND commercialUsername = ? AND isSync = 1
      `;
      const result = await this.databaseService.query(countSql, [sessionId, commercialUsername]);
      return result?.values?.[0]?.count || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des membres:', error);
      return 0;
    }
  }

  /**
   * Compte le nombre de collections à supprimer
   * @param commercialUsername Nom d'utilisateur du commercial
   * @returns Nombre de collections
   */
  private async countCollections(commercialUsername: string): Promise<number> {
    try {
      const countSql = `
        SELECT COUNT(*) as count 
        FROM tontine_collections 
        WHERE commercialUsername = ? AND isSync = 1
      `;
      const result = await this.databaseService.query(countSql, [commercialUsername]);
      return result?.values?.[0]?.count || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des collections:', error);
      return 0;
    }
  }

  /**
   * Compte le nombre de stocks à supprimer
   * @param commercialUsername Nom d'utilisateur du commercial
   * @returns Nombre de stocks
   */
  private async countStocks(commercialUsername: string): Promise<number> {
    try {
      const countSql = `
        SELECT COUNT(*) as count 
        FROM tontine_stocks 
        WHERE commercial = ? AND isSync = 1
      `;
      const result = await this.databaseService.query(countSql, [commercialUsername]);
      return result?.values?.[0]?.count || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des stocks:', error);
      return 0;
    }
  }
}
