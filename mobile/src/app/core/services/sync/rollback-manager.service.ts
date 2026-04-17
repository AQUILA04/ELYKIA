import { Injectable } from '@angular/core';
import { DatabaseService } from '../database.service';
import { 
  IRollbackManager, 
  RestorePoint, 
  DataSnapshot, 
  SyncMetadata 
} from '../../models/tontine-sync.models';

/**
 * Service responsable de la gestion des points de restauration et des rollbacks
 * Implémente l'interface IRollbackManager
 * 
 * Ce service permet de:
 * - Créer des snapshots des données avant synchronisation
 * - Restaurer les données en cas d'échec de synchronisation
 * - Nettoyer les anciens points de restauration
 */
@Injectable({
  providedIn: 'root'
})
export class RollbackManagerService implements IRollbackManager {

  private static readonly RESTORE_POINTS_TABLE = 'sync_restore_points';
  private static readonly MAX_RESTORE_POINTS = 5; // Nombre maximum de points de restauration à conserver

  constructor(private databaseService: DatabaseService) {}

  /**
   * Crée un point de restauration avec un snapshot des données actuelles
   * @returns Promise du point de restauration créé
   */
  async createRestorePoint(): Promise<RestorePoint> {
    try {
      // Créer la table des points de restauration si elle n'existe pas
      await this.ensureRestorePointsTableExists();

      // Créer le snapshot des données actuelles
      const dataSnapshot = await this.createDataSnapshot();

      // Créer les métadonnées
      const metadata: SyncMetadata = {
        lastSyncDate: new Date(),
        lastSuccessfulSync: new Date(),
        syncVersion: '1.0.0',
        dataChecksum: this.calculateSnapshotChecksum(dataSnapshot),
        totalItemsSynced: dataSnapshot.members.length + dataSnapshot.collections.length + dataSnapshot.stocks.length,
        syncDuration: 0
      };

      // Créer le point de restauration
      const restorePoint: RestorePoint = {
        id: this.generateRestorePointId(),
        timestamp: new Date(),
        dataSnapshot,
        metadata
      };

      // Sauvegarder le point de restauration dans la base de données
      await this.saveRestorePoint(restorePoint);

      return restorePoint;
    } catch (error) {
      console.error('Erreur lors de la création du point de restauration:', error);
      throw new Error(`Échec de la création du point de restauration: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Effectue un rollback vers un point de restauration
   * @param restorePoint Point de restauration cible
   */
  async rollbackToRestorePoint(restorePoint: RestorePoint): Promise<void> {
    if (!restorePoint || !restorePoint.dataSnapshot) {
      throw new Error('Point de restauration invalide');
    }

    try {
      // Restaurer les données depuis le snapshot
      await this.restoreDataFromSnapshot(restorePoint.dataSnapshot);

      console.log(`Rollback effectué avec succès vers le point de restauration ${restorePoint.id}`);
    } catch (error) {
      console.error('Erreur lors du rollback:', error);
      throw new Error(`Échec du rollback: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Nettoie les anciens points de restauration
   * Conserve uniquement les N points les plus récents
   */
  async cleanupRestorePoints(): Promise<void> {
    try {
      await this.ensureRestorePointsTableExists();

      // Récupérer tous les points de restauration triés par date décroissante
      const allRestorePoints = await this.getAllRestorePoints();

      // Si on a plus de points que le maximum autorisé, supprimer les plus anciens
      if (allRestorePoints.length > RollbackManagerService.MAX_RESTORE_POINTS) {
        const pointsToDelete = allRestorePoints.slice(RollbackManagerService.MAX_RESTORE_POINTS);
        
        for (const point of pointsToDelete) {
          await this.deleteRestorePoint(point.id);
        }

        console.log(`Nettoyage effectué: ${pointsToDelete.length} points de restauration supprimés`);
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des points de restauration:', error);
      throw new Error(`Échec du nettoyage des points de restauration: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Crée un snapshot des données actuelles
   * @returns DataSnapshot contenant les données des membres, collections et stocks
   */
  private async createDataSnapshot(): Promise<DataSnapshot> {
    try {
      // Récupérer la session tontine actuelle
      const session = await this.databaseService.getTontineSession();
      const sessionId = session?.id;

      if (!sessionId) {
        // Si pas de session, retourner un snapshot vide
        return {
          members: [],
          collections: [],
          stocks: [],
          timestamp: new Date()
        };
      }

      // Récupérer toutes les données tontine
      const membersSql = 'SELECT * FROM tontine_members WHERE tontineSessionId = ?';
      const membersResult = await this.databaseService.query(membersSql, [sessionId]);
      const members = membersResult?.values || [];

      const collectionsSql = 'SELECT * FROM tontine_collections';
      const collectionsResult = await this.databaseService.query(collectionsSql);
      const collections = collectionsResult?.values || [];

      const stocksSql = 'SELECT * FROM tontine_stocks WHERE tontineSessionId = ?';
      const stocksResult = await this.databaseService.query(stocksSql, [sessionId]);
      const stocks = stocksResult?.values || [];

      return {
        members,
        collections,
        stocks,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Erreur lors de la création du snapshot:', error);
      throw new Error(`Échec de la création du snapshot: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Restaure les données depuis un snapshot
   * @param snapshot Snapshot contenant les données à restaurer
   */
  private async restoreDataFromSnapshot(snapshot: DataSnapshot): Promise<void> {
    try {
      // Récupérer la session tontine actuelle
      const session = await this.databaseService.getTontineSession();
      const sessionId = session?.id;

      if (!sessionId) {
        throw new Error('Aucune session tontine trouvée pour la restauration');
      }

      // Supprimer les données actuelles
      await this.databaseService.execute('DELETE FROM tontine_collections');
      await this.databaseService.execute('DELETE FROM tontine_stocks WHERE tontineSessionId = ?', [sessionId]);
      await this.databaseService.execute('DELETE FROM tontine_member_amount_history WHERE tontineMemberId IN (SELECT id FROM tontine_members WHERE tontineSessionId = ?)', [sessionId]);
      await this.databaseService.execute('DELETE FROM tontine_deliveries WHERE tontineMemberId IN (SELECT id FROM tontine_members WHERE tontineSessionId = ?)', [sessionId]);
      await this.databaseService.execute('DELETE FROM tontine_members WHERE tontineSessionId = ?', [sessionId]);

      // Restaurer les membres
      if (snapshot.members.length > 0) {
        await this.databaseService.saveTontineMembers(snapshot.members);
      }

      // Restaurer les collections
      if (snapshot.collections.length > 0) {
        await this.databaseService.saveTontineCollections(snapshot.collections);
      }

      // Restaurer les stocks
      if (snapshot.stocks.length > 0) {
        await this.databaseService.saveTontineStocks(snapshot.stocks);
      }

      console.log('Données restaurées avec succès depuis le snapshot');
    } catch (error) {
      console.error('Erreur lors de la restauration des données:', error);
      throw new Error(`Échec de la restauration des données: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Calcule un checksum pour un snapshot
   * @param snapshot Snapshot pour lequel calculer le checksum
   * @returns Checksum calculé
   */
  private calculateSnapshotChecksum(snapshot: DataSnapshot): string {
    try {
      const data = {
        membersCount: snapshot.members.length,
        collectionsCount: snapshot.collections.length,
        stocksCount: snapshot.stocks.length,
        timestamp: snapshot.timestamp.toISOString()
      };
      return btoa(JSON.stringify(data));
    } catch (error) {
      console.error('Erreur lors du calcul du checksum:', error);
      return '';
    }
  }

  /**
   * Génère un ID unique pour un point de restauration
   * @returns ID unique
   */
  private generateRestorePointId(): string {
    return `restore_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Assure que la table des points de restauration existe
   */
  private async ensureRestorePointsTableExists(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS ${RollbackManagerService.RESTORE_POINTS_TABLE} (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        dataSnapshot TEXT NOT NULL,
        metadata TEXT NOT NULL
      )
    `;
    await this.databaseService.execute(createTableSql);
  }

  /**
   * Sauvegarde un point de restauration dans la base de données
   * @param restorePoint Point de restauration à sauvegarder
   */
  private async saveRestorePoint(restorePoint: RestorePoint): Promise<void> {
    const insertSql = `
      INSERT INTO ${RollbackManagerService.RESTORE_POINTS_TABLE} 
      (id, timestamp, dataSnapshot, metadata) 
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [
      restorePoint.id,
      restorePoint.timestamp.toISOString(),
      JSON.stringify(restorePoint.dataSnapshot),
      JSON.stringify(restorePoint.metadata)
    ];

    await this.databaseService.execute(insertSql, params);
  }

  /**
   * Récupère tous les points de restauration triés par date décroissante
   * @returns Liste des points de restauration
   */
  private async getAllRestorePoints(): Promise<RestorePoint[]> {
    const selectSql = `
      SELECT * FROM ${RollbackManagerService.RESTORE_POINTS_TABLE} 
      ORDER BY timestamp DESC
    `;
    
    const result = await this.databaseService.query(selectSql);
    const rows = result?.values || [];

    return rows.map((row: any) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      dataSnapshot: JSON.parse(row.dataSnapshot),
      metadata: JSON.parse(row.metadata)
    }));
  }

  /**
   * Supprime un point de restauration
   * @param id ID du point de restauration à supprimer
   */
  private async deleteRestorePoint(id: string): Promise<void> {
    const deleteSql = `
      DELETE FROM ${RollbackManagerService.RESTORE_POINTS_TABLE} 
      WHERE id = ?
    `;
    await this.databaseService.execute(deleteSql, [id]);
  }
}
