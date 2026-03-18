import { Injectable } from '@angular/core';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class MigrationService {

  constructor(private log: LoggerService) { }

  async runMigrations(db: SQLiteDBConnection, fromVersion: number, toVersion: number): Promise<void> {
    this.log.log(`Running migrations from version ${fromVersion} to ${toVersion}`);
    try {
      for (let version = fromVersion + 1; version <= toVersion; version++) {
        this.log.log(`Applying migration for version ${version}`);
        await this.applyMigration(db, version);
        this.log.log(`Successfully applied migration for version ${version}`);
      }
    } catch (error) {
      this.log.log(`Error running migrations: ${error}`);
      console.error('Error running migrations', error);
      // Re-throw the error to stop the database initialization if a migration fails
      throw error;
    }
  }

  private async applyMigration(db: SQLiteDBConnection, version: number): Promise<void> {
    switch (version) {
      case 3:
        await this.migrateToV3(db);
        break;
      case 4:
        await this.migrateToV4(db);
        break;
      case 5:
        await this.migrateToV5(db);
        break;
      case 6:
        await this.migrateToV6(db);
        break;
      case 7:
        await this.migrateToV7(db);
        break;
      case 8:
        await this.migrateToV8(db);
        break;
      case 9:
        await this.migrateToV9(db);
        break;
      case 10:
        // Version 10 was skipped/empty in previous deployments
        this.log.log('Migration v10 is empty/skipped.');
        break;
      case 11:
        await this.migrateToV11(db);
        break;
      case 12:
        await this.migrateToV12(db);
        break;
      case 13:
        await this.migrateToV13(db);
        break;
      case 14:
        await this.migrateToV14(db);
        break;
      case 15:
        // Version 15 was handled by createTables (new table tontine_member_amount_history)
        this.log.log('Migration v15 is handled by createTables.');
        break;
      case 16:
        await this.migrateToV16(db);
        break;
      case 17:
        // Version 17 was handled by createTables (thumbnail columns)
        this.log.log('Migration v17 is handled by createTables.');
        break;
      case 18:
        await this.migrateToV18(db);
        break;
      default:
        console.log(`No migration needed for version ${version}`);
    }
  }

  /* methods restored */

  private async migrateToV3(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Executing migration to v3: Adding updatedPhoto column to clients table.');
      await db.execute("ALTER TABLE clients ADD COLUMN updatedPhoto BOOLEAN DEFAULT 0;");
      this.log.log('Migration to v3 successful.');
    } catch (error: any) {
      if ((error.message && error.message.toLowerCase().includes('duplicate column')) || (error.toString && error.toString().toLowerCase().includes('duplicate column'))) {
        this.log.log('Migration to v3 already applied: updatedPhoto column exists.');
      } else {
        this.log.log(`Error in migration v3: ${error}`);
        console.error('Error in migration v3', error);
        throw error;
      }
    }
  }

  private async migrateToV4(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Executing migration to v4: Creating orders and order_items tables.');

      await db.execute(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          reference TEXT NOT NULL,
          totalAmount REAL NOT NULL,
          advance REAL DEFAULT 0,
          remainingAmount REAL,
          dailyPayment REAL DEFAULT 0,
          startDate TEXT NOT NULL,
          endDate TEXT,
          status TEXT NOT NULL,
          clientId TEXT NOT NULL,
          commercialId TEXT NOT NULL,
          isLocal BOOLEAN DEFAULT 1,
          isSync BOOLEAN DEFAULT 0,
          syncDate TEXT,
          createdAt TEXT NOT NULL,
          syncHash TEXT,
          articleCount INTEGER DEFAULT 0,
          FOREIGN KEY (clientId) REFERENCES clients(id)
        );
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS order_items (
          id TEXT PRIMARY KEY,
          orderId TEXT NOT NULL,
          articleId TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unitPrice REAL NOT NULL,
          totalPrice REAL NOT NULL,
          articleName TEXT,
          FOREIGN KEY (orderId) REFERENCES orders(id),
          FOREIGN KEY (articleId) REFERENCES articles(id)
        );
      `);

      await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_clientId ON orders(clientId);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_commercialId ON orders(commercialId);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);`);
      await db.execute(`CREATE INDEX IF NOT EXISTS idx_order_items_articleId ON order_items(articleId);`);

      this.log.log('Migration to v4 successful: Orders tables created.');
    } catch (error) {
      this.log.log(`Error in migration v4: ${error}`);
      console.error('Error in migration v4', error);
      throw error;
    }
  }

  private async migrateToV5(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Executing migration to v5: Adding photo URL columns to clients table.');

      await db.execute("ALTER TABLE clients ADD COLUMN profilPhotoUrl TEXT;");
      await db.execute("ALTER TABLE clients ADD COLUMN cardPhotoUrl TEXT;");
      await db.execute("ALTER TABLE clients ADD COLUMN updatedPhotoUrl BOOLEAN DEFAULT 0;");

      this.log.log('Migration to v5 successful: Photo URL columns added to clients table.');
    } catch (error: any) {
      if ((error.message && error.message.toLowerCase().includes('duplicate column')) || (error.toString && error.toString().toLowerCase().includes('duplicate column'))) {
        this.log.log('Migration to v5 already applied: photo URL columns exist.');
      } else {
        this.log.log(`Error in migration v5: ${error}`);
        console.error('Error in migration v5', error);
        throw error;
      }
    }
  }

  private async migrateToV6(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Executing migration to v6: Creating Tontine tables.');

      const createTables = `
        CREATE TABLE IF NOT EXISTS tontine_sessions (
            id TEXT PRIMARY KEY,
            year INTEGER,
            startDate TEXT,
            endDate TEXT,
            status TEXT,
            memberCount INTEGER,
            totalCollected REAL,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            syncHash TEXT
        );

        CREATE TABLE IF NOT EXISTS tontine_members (
            id TEXT PRIMARY KEY,
            tontineSessionId TEXT,
            clientId TEXT,
            commercialUsername TEXT,
            totalContribution REAL DEFAULT 0,
            deliveryStatus TEXT,
            registrationDate TEXT,
            isLocal BOOLEAN DEFAULT 0,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            syncHash TEXT,
            FOREIGN KEY(tontineSessionId) REFERENCES tontine_sessions(id),
            FOREIGN KEY(clientId) REFERENCES clients(id)
        );

        CREATE TABLE IF NOT EXISTS tontine_collections (
            id TEXT PRIMARY KEY,
            tontineMemberId TEXT,
            amount REAL,
            collectionDate TEXT,
            isLocal BOOLEAN DEFAULT 0,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            syncHash TEXT,
            FOREIGN KEY(tontineMemberId) REFERENCES tontine_members(id)
        );

        CREATE TABLE IF NOT EXISTS tontine_deliveries (
            id TEXT PRIMARY KEY,
            tontineMemberId TEXT,
            commercialUsername TEXT,
            requestDate TEXT,
            deliveryDate TEXT,
            totalAmount REAL,
            status TEXT,
            isLocal BOOLEAN DEFAULT 0,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            syncHash TEXT,
            FOREIGN KEY(tontineMemberId) REFERENCES tontine_members(id)
        );

        CREATE TABLE IF NOT EXISTS tontine_delivery_items (
            id TEXT PRIMARY KEY,
            tontineDeliveryId TEXT,
            articleId TEXT,
            quantity INTEGER,
            unitPrice REAL,
            totalPrice REAL,
            FOREIGN KEY(tontineDeliveryId) REFERENCES tontine_deliveries(id),
            FOREIGN KEY(articleId) REFERENCES articles(id)
        );
      `;

      await db.execute(createTables);
      this.log.log('Migration to v6 successful: Tontine tables created.');

    } catch (error) {
      this.log.log(`Error in migration v6: ${error}`);
      console.error('Error in migration v6', error);
      throw error;
    }
  }

  private async migrateToV7(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Running migration to v7: Adding commercialUsername to tontine_collections...');

      const alterTable = `
        ALTER TABLE tontine_collections ADD COLUMN commercialUsername TEXT;
      `;

      await db.execute(alterTable);
      this.log.log('Migration to v7 successful: commercialUsername added to tontine_collections.');

    } catch (error) {
      this.log.log(`Error in migration v7: ${error}`);
      console.error('Error in migration v7', error);
      throw error;
    }
  }

  private async migrateToV8(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Running migration to v8: Creating indexes for Tontine tables...');

      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_tontine_members_sessionId ON tontine_members(tontineSessionId);
        CREATE INDEX IF NOT EXISTS idx_tontine_members_commercial ON tontine_members(commercialUsername);
        CREATE INDEX IF NOT EXISTS idx_tontine_members_clientId ON tontine_members(clientId);
        CREATE INDEX IF NOT EXISTS idx_tontine_collections_memberId ON tontine_collections(tontineMemberId);
        CREATE INDEX IF NOT EXISTS idx_tontine_collections_commercial ON tontine_collections(commercialUsername);
        CREATE INDEX IF NOT EXISTS idx_tontine_collections_date ON tontine_collections(collectionDate);
        CREATE INDEX IF NOT EXISTS idx_tontine_collections_commercial_date ON tontine_collections(commercialUsername, collectionDate);
        CREATE INDEX IF NOT EXISTS idx_tontine_deliveries_memberId ON tontine_deliveries(tontineMemberId);
        CREATE INDEX IF NOT EXISTS idx_tontine_deliveries_commercial ON tontine_deliveries(commercialUsername);
        CREATE INDEX IF NOT EXISTS idx_tontine_deliveries_status ON tontine_deliveries(status);
        CREATE INDEX IF NOT EXISTS idx_tontine_delivery_items_deliveryId ON tontine_delivery_items(tontineDeliveryId);
        CREATE INDEX IF NOT EXISTS idx_tontine_delivery_items_articleId ON tontine_delivery_items(articleId);
      `;

      await db.execute(createIndexes);
      this.log.log('Migration to v8 successful: Tontine indexes created.');

    } catch (error) {
      this.log.log(`Error in migration v8: ${error}`);
      console.error('Error in migration v8', error);
      throw error;
    }
  }

  private async migrateToV9(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Running migration to v9: Adding frequency, amount, and notes to tontine_members...');

      await db.execute("ALTER TABLE tontine_members ADD COLUMN frequency TEXT;");
      await db.execute("ALTER TABLE tontine_members ADD COLUMN amount REAL;");
      await db.execute("ALTER TABLE tontine_members ADD COLUMN notes TEXT;");

      this.log.log('Migration to v9 successful.');

    } catch (error: any) {
      if ((error.message && error.message.toLowerCase().includes('duplicate column')) || (error.toString && error.toString().toLowerCase().includes('duplicate column'))) {
        this.log.log('Migration to v9 already applied.');
      } else {
        this.log.log(`Error in migration v9: ${error}`);
        console.error('Error in migration v9', error);
        throw error;
      }
    }
  }

  private async migrateToV11(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Running migration to v11: Adding tontineCollector to clients...');

      await db.execute("ALTER TABLE clients ADD COLUMN tontineCollector TEXT;");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_clients_tontineCollector ON clients(tontineCollector);");

      this.log.log('Migration to v11 successful.');

    } catch (error: any) {
      if ((error.message && error.message.toLowerCase().includes('duplicate column')) || (error.toString && error.toString().toLowerCase().includes('duplicate column'))) {
        this.log.log('Migration to v11 already applied.');
      } else {
        this.log.log(`Error in migration v11: ${error}`);
        console.error('Error in migration v11', error);
        throw error;
      }
    }
  }

  private async migrateToV12(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Running migration to v12: Adding syncHash to recoveries and distribution_items...');

      // Add syncHash to recoveries
      try {
        await db.execute("ALTER TABLE recoveries ADD COLUMN syncHash TEXT;");
      } catch (e: any) {
        if (!((e.message && e.message.toLowerCase().includes('duplicate column')) || (e.toString && e.toString().toLowerCase().includes('duplicate column')))) {
          throw e;
        }
      }

      // Add syncHash to distribution_items
      try {
        await db.execute("ALTER TABLE distribution_items ADD COLUMN syncHash TEXT;");
      } catch (e: any) {
        if (!((e.message && e.message.toLowerCase().includes('duplicate column')) || (e.toString && e.toString().toLowerCase().includes('duplicate column')))) {
          throw e;
        }
      }

      this.log.log('Migration to v12 successful.');
    } catch (error: any) {
      this.log.log(`Error in migration v12: ${error}`);
      console.error('Error in migration v12', error);
      throw error;
    }
  }

  private async migrateToV13(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Running migration to v13: Creating indexes for distributions table...');

      await db.execute("CREATE INDEX IF NOT EXISTS idx_distributions_clientId ON distributions(clientId);");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_distributions_commercialId ON distributions(commercialId);");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_distributions_status ON distributions(status);");

      this.log.log('Migration to v13 successful.');
    } catch (error) {
      this.log.log(`Error in migration v13: ${error}`);
      console.error('Error in migration v13', error);
      throw error;
    }
  }

  private async migrateToV14(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Running migration to v14: Adding updateScope to tontine_members...');

      await db.execute("ALTER TABLE tontine_members ADD COLUMN updateScope TEXT;");

      this.log.log('Migration to v14 successful.');
    } catch (error: any) {
      if ((error.message && error.message.toLowerCase().includes('duplicate column')) || (error.toString && error.toString().toLowerCase().includes('duplicate column'))) {
        this.log.log('Migration to v14 already applied.');
      } else {
        this.log.log(`Error in migration v14: ${error}`);
        console.error('Error in migration v14', error);
        throw error;
      }
    }
  }

  private async migrateToV16(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Running migration to v16: Adding commercialUsername to accounts and transactions...');

      try {
        await db.execute("ALTER TABLE accounts ADD COLUMN commercialUsername TEXT;");
      } catch (e: any) {
        if (!((e.message && e.message.toLowerCase().includes('duplicate column')) || (e.toString && e.toString().toLowerCase().includes('duplicate column')))) {
          throw e;
        }
      }

      try {
        await db.execute("ALTER TABLE transactions ADD COLUMN commercialUsername TEXT;");
      } catch (e: any) {
        if (!((e.message && e.message.toLowerCase().includes('duplicate column')) || (e.toString && e.toString().toLowerCase().includes('duplicate column')))) {
          throw e;
        }
      }

      this.log.log('Migration to v16 successful.');
    } catch (error: any) {
      this.log.log(`Error in migration v16: ${error}`);
      console.error('Error in migration v16', error);
      throw error;
    }
  }

  private async migrateToV18(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Running migration to v18: Adding UNIQUE indexes on clients.phone and clients.cardID...');

      try {
        await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);');
      } catch (e: any) {
        // L'index peut déjà exister ou il peut y avoir des doublons existants.
        // On log l'erreur mais on ne bloque pas la migration.
        this.log.log(`Migration v18: Could not create idx_clients_phone: ${e?.message ?? e}`);
        console.warn('Migration v18: Could not create idx_clients_phone', e);
      }

      try {
        await db.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_cardID ON clients(cardID);');
      } catch (e: any) {
        this.log.log(`Migration v18: Could not create idx_clients_cardID: ${e?.message ?? e}`);
        console.warn('Migration v18: Could not create idx_clients_cardID', e);
      }

      this.log.log('Migration to v18 successful.');
    } catch (error: any) {
      this.log.log(`Error in migration v18: ${error}`);
      console.error('Error in migration v18', error);
      throw error;
    }
  }
}
