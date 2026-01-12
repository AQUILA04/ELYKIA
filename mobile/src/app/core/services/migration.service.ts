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
        await this.migrateToV10(db);
        break;
      default:
        console.log(`No migration needed for version ${version}`);
    }
  }

  private async migrateToV3(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Executing migration to v3: Adding updatedPhoto column to clients table.');
      await db.execute("ALTER TABLE clients ADD COLUMN updatedPhoto BOOLEAN DEFAULT 0;");
      this.log.log('Migration to v3 successful.');
    } catch (error: any) {
      // Check if the error is due to a duplicate column, which is expected on subsequent runs.
      if ((error.message && error.message.toLowerCase().includes('duplicate column')) || (error.toString && error.toString().toLowerCase().includes('duplicate column'))) {
        this.log.log('Migration to v3 already applied: updatedPhoto column exists.');
      } else {
        this.log.log(`Error in migration v3: ${error}`);
        console.error('Error in migration v3', error);
        throw error; // Re-throw other unexpected errors
      }
    }
  }

  private async migrateToV4(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Executing migration to v4: Creating orders and order_items tables.');

      // Create orders table
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

      // Create order_items table
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

      // Create indexes for better performance
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

      // Ajouter les colonnes pour les URLs des photos
      await db.execute("ALTER TABLE clients ADD COLUMN profilPhotoUrl TEXT;");
      await db.execute("ALTER TABLE clients ADD COLUMN cardPhotoUrl TEXT;");
      await db.execute("ALTER TABLE clients ADD COLUMN updatedPhotoUrl BOOLEAN DEFAULT 0;");

      this.log.log('Migration to v5 successful: Photo URL columns added to clients table.');
    } catch (error: any) {
      // Check if the error is due to a duplicate column, which is expected on subsequent runs.
      if ((error.message && error.message.toLowerCase().includes('duplicate column')) || (error.toString && error.toString().toLowerCase().includes('duplicate column'))) {
        this.log.log('Migration to v5 already applied: photo URL columns exist.');
      } else {
        this.log.log(`Error in migration v5: ${error}`);
        console.error('Error in migration v5', error);
        throw error; // Re-throw other unexpected errors
      }
    }
  }

  private async migrateToV6(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Executing migration to v6: Creating Tontine tables.');

      const createTables = `
        -- Table des sessions de tontine
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

        -- Table des membres de tontine
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

        -- Table des collectes de tontine
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

        -- Table des livraisons de tontine (Demandes de remise)
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

        -- Table des articles de livraison de tontine
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
      console.log('Running migration to v7...');

      // Add commercialUsername column to tontine_collections
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
      console.log('Running migration to v8...');

      // Create indexes for better query performance
      const createIndexes = `
        -- Index pour tontine_members: recherche par session
        CREATE INDEX IF NOT EXISTS idx_tontine_members_sessionId ON tontine_members(tontineSessionId);
        
        -- Index pour tontine_members: recherche par commercial
        CREATE INDEX IF NOT EXISTS idx_tontine_members_commercial ON tontine_members(commercialUsername);
        
        -- Index pour tontine_members: recherche par client
        CREATE INDEX IF NOT EXISTS idx_tontine_members_clientId ON tontine_members(clientId);
        
        -- Index pour tontine_collections: recherche par membre
        CREATE INDEX IF NOT EXISTS idx_tontine_collections_memberId ON tontine_collections(tontineMemberId);
        
        -- Index pour tontine_collections: recherche par commercial
        CREATE INDEX IF NOT EXISTS idx_tontine_collections_commercial ON tontine_collections(commercialUsername);
        
        -- Index pour tontine_collections: filtre par date
        CREATE INDEX IF NOT EXISTS idx_tontine_collections_date ON tontine_collections(collectionDate);
        
        -- Index composite pour tontine_collections: commercial + date (pour le dashboard KPI)
        CREATE INDEX IF NOT EXISTS idx_tontine_collections_commercial_date ON tontine_collections(commercialUsername, collectionDate);
        
        -- Index pour tontine_deliveries: recherche par membre
        CREATE INDEX IF NOT EXISTS idx_tontine_deliveries_memberId ON tontine_deliveries(tontineMemberId);
        
        -- Index pour tontine_deliveries: recherche par commercial
        CREATE INDEX IF NOT EXISTS idx_tontine_deliveries_commercial ON tontine_deliveries(commercialUsername);
        
        -- Index pour tontine_deliveries: filtre par statut
        CREATE INDEX IF NOT EXISTS idx_tontine_deliveries_status ON tontine_deliveries(status);
        
        -- Index pour tontine_delivery_items: recherche par livraison
        CREATE INDEX IF NOT EXISTS idx_tontine_delivery_items_deliveryId ON tontine_delivery_items(tontineDeliveryId);
        
        -- Index pour tontine_delivery_items: recherche par article
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
}
  private async migrateToV10(db: SQLiteDBConnection): Promise<void> {
    try {
      this.log.log('Running migration to v10: Adding commercialId to transactions table...');
      console.log('Running migration to v10...');

      // Add commercialId column to transactions table
      const alterTable = `
        ALTER TABLE transactions ADD COLUMN commercialId TEXT;
      `;

      await db.execute(alterTable);
      
      // Create index for better query performance
      const createIndex = `
        CREATE INDEX IF NOT EXISTS idx_transactions_commercialId ON transactions(commercialId);
      `;
      
      await db.execute(createIndex);
      
      this.log.log('Migration to v10 successful: commercialId added to transactions table with index.');

    } catch (error: any) {
      // Check if the error is due to a duplicate column, which is expected on subsequent runs.
      if ((error.message && error.message.toLowerCase().includes('duplicate column')) || 
          (error.toString && error.toString().toLowerCase().includes('duplicate column'))) {
        this.log.log('Migration to v10 already applied: commercialId column exists.');
      } else {
        this.log.log(`Error in migration v10: ${error}`);
        console.error('Error in migration v10', error);
        throw error; // Re-throw other unexpected errors
      }
    }
  }