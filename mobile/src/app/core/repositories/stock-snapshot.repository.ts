import { Injectable } from '@angular/core';
import { DatabaseService } from '../services/database.service';
import { StockSnapshot } from '../../models/stock-snapshot.model';
import { LoggerService } from '../services/logger.service';

/**
 * Repository pour la table `commercial_stock_snapshot`.
 *
 * Cette table stocke, par commercial, le stock total reçu lors de la dernière
 * initialisation depuis le serveur (`stockAtInit`) et le cumul des quantités
 * vendues localement depuis cette initialisation (`localSalesTotal`).
 *
 * Elle est réinitialisée à chaque appel de `syncCommercialStock()` (initialisation
 * serveur → local) et incrémentée à chaque distribution locale validée.
 */
@Injectable({
  providedIn: 'root'
})
export class StockSnapshotRepository {

  constructor(
    private db: DatabaseService,
    private log: LoggerService
  ) {}

  /**
   * Récupère le snapshot courant pour un commercial.
   * Retourne null si aucun snapshot n'existe encore.
   */
  async getSnapshot(commercialUsername: string): Promise<StockSnapshot | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM commercial_stock_snapshot WHERE commercialUsername = ?`,
        [commercialUsername]
      );
      if (result?.values && result.values.length > 0) {
        return result.values[0] as StockSnapshot;
      }
      return null;
    } catch (error) {
      this.log.error('[StockSnapshotRepository] Error getting snapshot', error);
      return null;
    }
  }

  /**
   * Crée ou remplace le snapshot pour un commercial.
   * Appelé lors de l'initialisation du stock depuis le serveur.
   *
   * @param commercialUsername Nom d'utilisateur du commercial
   * @param stockAtInit Quantité totale de stock reçue du serveur (somme de tous les articles)
   */
  async upsertSnapshot(commercialUsername: string, stockAtInit: number): Promise<void> {
    try {
      const now = new Date().toISOString();
      await this.db.executeSql(
        `INSERT INTO commercial_stock_snapshot (commercialUsername, stockAtInit, localSalesTotal, initDate, updatedAt)
         VALUES (?, ?, 0, ?, ?)
         ON CONFLICT(commercialUsername) DO UPDATE SET
           stockAtInit = excluded.stockAtInit,
           localSalesTotal = 0,
           initDate = excluded.initDate,
           updatedAt = excluded.updatedAt`,
        [commercialUsername, stockAtInit, now, now]
      );
      this.log.log(`[StockSnapshotRepository] Snapshot upserted for ${commercialUsername}: stockAtInit=${stockAtInit}`);
    } catch (error) {
      this.log.error('[StockSnapshotRepository] Error upserting snapshot', error);
      throw error;
    }
  }

  /**
   * Incrémente le cumul des ventes locales pour un commercial.
   * Appelé après chaque distribution locale validée.
   *
   * @param commercialUsername Nom d'utilisateur du commercial
   * @param quantitySold Quantité totale vendue dans la nouvelle distribution
   */
  async incrementLocalSales(commercialUsername: string, quantitySold: number): Promise<void> {
    try {
      const now = new Date().toISOString();
      await this.db.executeSql(
        `UPDATE commercial_stock_snapshot
         SET localSalesTotal = localSalesTotal + ?,
             updatedAt = ?
         WHERE commercialUsername = ?`,
        [quantitySold, now, commercialUsername]
      );
      this.log.log(`[StockSnapshotRepository] Local sales incremented for ${commercialUsername}: +${quantitySold}`);
    } catch (error) {
      this.log.error('[StockSnapshotRepository] Error incrementing local sales', error);
      throw error;
    }
  }

  /**
   * Vérifie si une nouvelle distribution est autorisée compte tenu du stock disponible.
   *
   * Condition : stockAtInit >= localSalesTotal + newDistributionTotal
   *
   * @param commercialUsername Nom d'utilisateur du commercial
   * @param newDistributionTotal Quantité totale de la nouvelle distribution à valider
   * @returns Objet indiquant si la distribution est autorisée, avec les valeurs de stock pour le message d'erreur
   */
  async canDistribute(
    commercialUsername: string,
    newDistributionTotal: number
  ): Promise<{ allowed: boolean; stockAtInit: number; localSalesTotal: number; available: number }> {
    try {
      const snapshot = await this.getSnapshot(commercialUsername);

      // Si aucun snapshot n'existe (ex : première utilisation sans initialisation),
      // on laisse passer pour ne pas bloquer le commercial.
      if (!snapshot) {
        this.log.log(`[StockSnapshotRepository] No snapshot found for ${commercialUsername}, allowing distribution.`);
        return { allowed: true, stockAtInit: 0, localSalesTotal: 0, available: 0 };
      }

      const available = snapshot.stockAtInit - snapshot.localSalesTotal;
      const allowed = available >= newDistributionTotal;

      this.log.log(
        `[StockSnapshotRepository] canDistribute for ${commercialUsername}: ` +
        `stockAtInit=${snapshot.stockAtInit}, localSalesTotal=${snapshot.localSalesTotal}, ` +
        `available=${available}, newDistributionTotal=${newDistributionTotal}, allowed=${allowed}`
      );

      return {
        allowed,
        stockAtInit: snapshot.stockAtInit,
        localSalesTotal: snapshot.localSalesTotal,
        available
      };
    } catch (error) {
      this.log.error('[StockSnapshotRepository] Error checking canDistribute', error);
      // En cas d'erreur technique, on laisse passer pour ne pas bloquer le commercial
      return { allowed: true, stockAtInit: 0, localSalesTotal: 0, available: 0 };
    }
  }
}
