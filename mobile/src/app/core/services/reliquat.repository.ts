import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { ClientReliquat } from '../../models/reliquat.model';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class ReliquatRepository {

  constructor(private db: DatabaseService, private log: LoggerService) {}

  async findByClientId(clientId: string): Promise<ClientReliquat | null> {
    try {
      const sql = `SELECT * FROM client_reliquats WHERE clientId = ?`;
      const result = await this.db.query(sql, [clientId]);
      
      if (result.values && result.values.length > 0) {
        return this.mapRowToReliquat(result.values[0]);
      }
      return null;
    } catch (error) {
      this.log.log(`Error in findByClientId: ${error}`);
      console.error(error);
      return null;
    }
  }

  async upsert(reliquat: ClientReliquat): Promise<void> {
    try {
      const existing = await this.findByClientId(reliquat.clientId);
      if (existing) {
        const sql = `
          UPDATE client_reliquats 
          SET totalAmount = ?, lastRecoveryId = ?, updatedAt = ?, lastAccountedDate = ?, isSync = ?, syncDate = ?
          WHERE clientId = ?
        `;
        await this.db.execute(sql, [
          reliquat.totalAmount, 
          reliquat.lastRecoveryId, 
          reliquat.updatedAt, 
          reliquat.lastAccountedDate, 
          reliquat.isSync ? 1 : 0, 
          reliquat.syncDate, 
          reliquat.clientId
        ]);
      } else {
        const sql = `
          INSERT INTO client_reliquats 
          (id, clientId, commercialId, totalAmount, lastRecoveryId, createdAt, updatedAt, lastAccountedDate, isSync, syncDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await this.db.execute(sql, [
          reliquat.id,
          reliquat.clientId,
          reliquat.commercialId,
          reliquat.totalAmount,
          reliquat.lastRecoveryId,
          reliquat.createdAt,
          reliquat.updatedAt,
          reliquat.lastAccountedDate,
          reliquat.isSync ? 1 : 0,
          reliquat.syncDate
        ]);
      }
    } catch (error) {
      this.log.log(`Error in upsert: ${error}`);
      console.error(error);
      throw error;
    }
  }

  async findByCommercialId(commercialId: string): Promise<ClientReliquat[]> {
    try {
      const sql = `SELECT * FROM client_reliquats WHERE commercialId = ?`;
      const result = await this.db.query(sql, [commercialId]);
      return (result.values || []).map((row: any) => this.mapRowToReliquat(row));
    } catch (error) {
      this.log.log(`Error in findByCommercialId: ${error}`);
      console.error(error);
      return [];
    }
  }

  async deleteSynced(commercialId: string): Promise<void> {
    try {
      const sql = `DELETE FROM client_reliquats WHERE commercialId = ? AND isSync = 1`;
      await this.db.execute(sql, [commercialId]);
    } catch (error) {
      this.log.log(`Error in deleteSynced: ${error}`);
      console.error(error);
      throw error;
    }
  }

  async findUnsynced(commercialId: string): Promise<ClientReliquat[]> {
    try {
      const sql = `SELECT * FROM client_reliquats WHERE commercialId = ? AND isSync = 0`;
      const result = await this.db.query(sql, [commercialId]);
      return (result.values || []).map((row: any) => this.mapRowToReliquat(row));
    } catch (error) {
      this.log.log(`Error in findUnsynced: ${error}`);
      console.error(error);
      return [];
    }
  }

  async markAsSynced(id: string): Promise<void> {
    try {
      const syncDate = new Date().toISOString();
      const sql = `UPDATE client_reliquats SET isSync = 1, syncDate = ? WHERE id = ?`;
      await this.db.execute(sql, [syncDate, id]);
    } catch (error) {
      this.log.log(`Error in markAsSynced: ${error}`);
      console.error(error);
      throw error;
    }
  }

  async findCreatedOnDate(commercialId: string, date: string): Promise<ClientReliquat[]> {
    try {
      // Assuming date is format 'YYYY-MM-DD' and createdAt is ISO 'YYYY-MM-DDTHH:mm...'
      const sql = `SELECT * FROM client_reliquats WHERE commercialId = ? AND date(createdAt) = date(?)`;
      const result = await this.db.query(sql, [commercialId, date]);
      return (result.values || []).map((row: any) => this.mapRowToReliquat(row));
    } catch (error) {
      this.log.log(`Error in findCreatedOnDate: ${error}`);
      console.error(error);
      return [];
    }
  }

  private mapRowToReliquat(row: any): ClientReliquat {
    return {
      id: row.id,
      clientId: row.clientId,
      commercialId: row.commercialId,
      totalAmount: row.totalAmount,
      lastRecoveryId: row.lastRecoveryId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastAccountedDate: row.lastAccountedDate,
      isSync: row.isSync === 1 || row.isSync === true,
      syncDate: row.syncDate
    };
  }
}
