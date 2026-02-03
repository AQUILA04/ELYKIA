import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection, capSQLiteSet } from '@capacitor-community/sqlite';
import { Account } from 'src/app/models/account.model';
import { Article } from 'src/app/models/article.model';
import { Client } from 'src/app/models/client.model';
import { Commercial } from 'src/app/models/commercial.model';
import { DistributionItem } from 'src/app/models/distribution-item.model';
import { Distribution } from 'src/app/models/distribution.model';
import { Locality } from 'src/app/models/locality.model';
import { StockOutput } from 'src/app/models/stock-output.model';
import { StockOutputItem } from 'src/app/models/stock-ouput-item';
import { Recovery } from 'src/app/models/recovery.model';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Util } from '../util/util';
import { DistributionMapper } from '../../shared/mapper/distribution.mapper';
import { StockOutputMapper } from '../../shared/mapper/stock-outpout.mapper';
import { ClientMapper } from '../../shared/mapper/client.mapper';
import { LoggerService } from './logger.service';
import { MigrationService } from './migration.service';
import { User } from '../../models/auth.model';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { RestoreMonitor, TransactionManager, DataIntegrityValidator, RestoreException } from './restore-utils';
import { RestoreResult, SqlStatement, TableCounts, RestoreError } from '../models/restore.models';
import { RestoreValidator } from './restore-validator.service';

interface DbRowWithHash {
  id: any;
  syncHash: string;
}
@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db: SQLiteDBConnection | null = null;

  constructor(
    private log: LoggerService,
    private migrationService: MigrationService,
    private restoreValidator: RestoreValidator
  ) { }

  async initializeDatabase(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'web') {
        try {
          const jeepEl = document.querySelector('jeep-sqlite');
          if (jeepEl) {
            await this.sqlite.initWebStore();
          } else {
            throw new Error('The jeep-sqlite element is not present in the DOM!');
          }
        } catch (err) {
          console.error('Database initialization error (web):', err);
        }
      }

      // NOTE: Le callback onUpgrade n'est pas utilisé dans votre logique actuelle,
      // ce qui est acceptable car vous gérez la migration manuellement.
      // const onUpgrade = async (db: SQLiteDBConnection, fromVersion: number, toVersion: number) => {
      //   await this.migrationService.runMigrations(db, fromVersion, toVersion);
      // };

      this.db = await this.sqlite.createConnection(
        'elykia_mobile_app.db',
        false,
        'no-encryption',
        2,
        false
      );
      await this.db.open();

      // 1. Créer les tables pour s'assurer qu'elles existent pour les nouveaux utilisateurs
      await this.createTables();

      // 2. Exécuter les migrations sur le schéma existant
      if (Capacitor.getPlatform() === 'android') {
        const currentVersion = await this.db.getVersion();
        const targetVersion = 11; // Incremented for tontineCollector update
        const dbVersion = currentVersion.version ?? 2;

        console.log('=== DATABASE VERSION CHECK ===');
        console.log('Current DB version:', dbVersion);
        console.log('Target DB version:', targetVersion);
        console.log('==============================');

        if (dbVersion < targetVersion) {
          await this.migrationService.runMigrations(this.db, dbVersion, targetVersion);

          await this.db.run(`PRAGMA user_version = ${targetVersion}`);
        }
      }


    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  async executeSql(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return await this.db.run(sql, params);
  }

  private generateHash(data: any, keysToInclude: string[]): string {
    const filteredData = keysToInclude.sort().reduce(
      (obj: { [key: string]: any }, key) => {
        obj[key] = data[key];
        return obj;
      },
      {}
    );
    return btoa(JSON.stringify(filteredData));
  }

  private async createTables(): Promise<void> {
    const createTables = `
        -- Table des utilisateurs
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            passwordHash TEXT NOT NULL,
            roles TEXT,
            accessToken TEXT,
            refreshToken TEXT,
            lastLogin DATETIME,
            isActive BOOLEAN DEFAULT 1,
            syncHash TEXT
        );

        -- Table des commerciaux
        CREATE TABLE IF NOT EXISTS commercials (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            fullName TEXT,
            email TEXT,
            phone TEXT,
            profilePhoto TEXT,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            syncHash TEXT
        );

        -- Table des articles
        CREATE TABLE IF NOT EXISTS articles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            commercialName TEXT,
            marque TEXT,
            model TEXT,
            type TEXT,
            creditSalePrice REAL,
            stockQuantity INTEGER,
            isSync BOOLEAN DEFAULT 0,
            lastUpdate DATETIME,
            syncHash TEXT
        );

        -- Table des stocks commerciaux (NOUVEAU)
        CREATE TABLE IF NOT EXISTS commercial_stock_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articleId TEXT NOT NULL,
            quantityRemaining INTEGER NOT NULL,
            quantityTaken INTEGER DEFAULT 0,
            quantitySold INTEGER DEFAULT 0,
            quantityReturned INTEGER DEFAULT 0,
            commercialUsername TEXT NOT NULL,
            month INTEGER,
            year INTEGER,
            updatedAt DATETIME,
            FOREIGN KEY(articleId) REFERENCES articles(id)
        );

        -- Table des localités
        CREATE TABLE IF NOT EXISTS localities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            region TEXT,
            isActive BOOLEAN DEFAULT 1,
            isLocal BOOLEAN DEFAULT 0,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            syncHash TEXT
        );

        -- Table des clients
        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            firstname TEXT NOT NULL,
            lastname TEXT NOT NULL,
            fullName TEXT,
            phone TEXT,
            address TEXT,
            dateOfBirth TEXT,
            occupation TEXT,
            clientType TEXT DEFAULT CLIENT,
            cardType TEXT,
            cardID TEXT,
            quarter TEXT,
            latitude REAL,
            longitude REAL,
            mll TEXT,
            profilPhoto TEXT,
            contactPersonName TEXT,
            contactPersonPhone TEXT,
            contactPersonAddress TEXT,
            commercial TEXT,
            creditInProgress BOOLEAN,
            isLocal BOOLEAN DEFAULT 1,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            syncHash TEXT,
            code TEXT,
            updated BOOLEAN DEFAULT 0,
            updatedPhoto BOOLEAN DEFAULT 0,
            cardPhoto TEXT,
            profilPhotoUrl TEXT,
            cardPhotoUrl TEXT,
            updatedPhotoUrl BOOLEAN DEFAULT 0,
            tontineCollector TEXT
        );

        -- Table des comptes clients
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            accountNumber TEXT UNIQUE NOT NULL,
            accountBalance REAL,
            old_balance REAL,
            updated BOOLEAN DEFAULT 0,
            status TEXT,
            clientId TEXT,
            isLocal BOOLEAN DEFAULT 0,
            isSync BOOLEAN DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            syncDate DATETIME,
            syncHash TEXT
            -- FOREIGN KEY(clientId) REFERENCES clients(id)
        );

        -- Table des sorties d'articles
        CREATE TABLE IF NOT EXISTS stock_outputs (
            id TEXT PRIMARY KEY,
            reference TEXT,
            status TEXT,
            updatable BOOLEAN DEFAULT 1,
            totalAmount REAL,
            createdAt DATETIME,
            commercialId TEXT,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            syncHash TEXT
        );

        -- Table des items de sortie
        CREATE TABLE IF NOT EXISTS stock_output_items (
            id TEXT PRIMARY KEY,
            stockOutputId TEXT,
            articleId TEXT,
            quantity INTEGER,
            unitPrice REAL,
            totalPrice REAL,
            FOREIGN KEY(stockOutputId) REFERENCES stock_outputs(id),
            FOREIGN KEY(articleId) REFERENCES articles(id)
        );

        -- Table des distributions
        CREATE TABLE IF NOT EXISTS distributions (
            id TEXT PRIMARY KEY,
            reference TEXT,
            creditId TEXT,
            totalAmount REAL,
            paidAmount REAL DEFAULT 0,
            advance REAL DEFAULT 0,
            remainingAmount REAL DEFAULT 0,
            dailyPayment REAL,
            startDate TEXT,
            endDate TEXT,
            status TEXT DEFAULT 'PENDING',
            clientId TEXT,
            commercialId TEXT,
            isLocal BOOLEAN DEFAULT 1,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            syncHash TEXT,
            articleCount INTEGER DEFAULT 0
            -- FOREIGN KEY(creditId) REFERENCES stock_outputs(id),
            -- FOREIGN KEY(clientId) REFERENCES clients(id)
        );

        -- Table des items de distribution
        CREATE TABLE IF NOT EXISTS distribution_items (
            id TEXT PRIMARY KEY,
            distributionId TEXT,
            articleId TEXT,
            quantity INTEGER,
            unitPrice REAL,
            totalPrice REAL,
            -- FOREIGN KEY(distributionId) REFERENCES distributions(id),
            FOREIGN KEY(articleId) REFERENCES articles(id)
        );

        -- Table des commandes
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
            articleCount INTEGER DEFAULT 0
            -- FOREIGN KEY (clientId) REFERENCES clients(id)
        );

        -- Table des items de commande
        CREATE TABLE IF NOT EXISTS order_items (
            id TEXT PRIMARY KEY,
            orderId TEXT NOT NULL,
            articleId TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unitPrice REAL NOT NULL,
            totalPrice REAL NOT NULL,
            articleName TEXT
            -- FOREIGN KEY (orderId) REFERENCES orders(id),
            -- FOREIGN KEY (articleId) REFERENCES articles(id)
        );

        -- Table des recouvrements
        CREATE TABLE IF NOT EXISTS recoveries (
            id TEXT PRIMARY KEY,
            amount REAL,
            paymentDate TEXT,
            paymentMethod TEXT,
            notes TEXT,
            distributionId TEXT,
            clientId TEXT,
            commercialId TEXT,
            isLocal BOOLEAN DEFAULT 1,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            isDefaultStake BOOLEAN DEFAULT 0
            -- FOREIGN KEY(distributionId) REFERENCES distributions(id),
            -- FOREIGN KEY(clientId) REFERENCES clients(id)
        );

        -- Table de suivi de synchronisation
        CREATE TABLE IF NOT EXISTS sync_logs (
            id TEXT PRIMARY KEY,
            entityType TEXT,
            entityId TEXT,
            operation TEXT,
            status TEXT,
            errorCode TEXT,
            requestData TEXT,
            responseData TEXT,
            entityDisplayName TEXT,
            entityDetails TEXT,
            errorMessage TEXT,
            syncDate DATETIME,
            retryCount INTEGER DEFAULT 0
        );

        -- Table des rapports journaliers
        CREATE TABLE IF NOT EXISTS daily_reports (
            id TEXT PRIMARY KEY,
            date TEXT,
            commercialId TEXT,
            totalDistributions INTEGER,
            totalDistributionAmount REAL,
            totalRecoveries INTEGER,
            totalRecoveryAmount REAL,
            newClients INTEGER,
            clientsInitialTotalBalance REAL,
            reportData TEXT,
            isPrinted BOOLEAN DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(commercialId) REFERENCES commercials(id)
        );

        -- Table des transactions pour l'historique client
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            clientId TEXT NOT NULL,
            referenceId TEXT, -- ID de la distribution ou du recouvrement
            type TEXT NOT NULL, -- 'distribution' ou 'payment'
            amount REAL NOT NULL,
            details TEXT,
            date DATETIME NOT NULL,
            isSync BOOLEAN DEFAULT 0,
            isLocal BOOLEAN DEFAULT 0
            -- FOREIGN KEY(clientId) REFERENCES clients(id)
        );

        -- Table de mapping des IDs locaux vers serveur
        CREATE TABLE IF NOT EXISTS id_mappings (
            localId TEXT NOT NULL,
            serverId TEXT NOT NULL,
            entityType TEXT NOT NULL, -- 'client', 'distribution', 'recovery', 'account'
            syncDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (localId, entityType)
        );

        -- Index pour optimiser les performances des commandes
        CREATE INDEX IF NOT EXISTS idx_orders_clientId ON orders(clientId);
        CREATE INDEX IF NOT EXISTS idx_orders_commercialId ON orders(commercialId);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items(orderId);
        CREATE INDEX IF NOT EXISTS idx_order_items_articleId ON order_items(articleId);
        CREATE INDEX IF NOT EXISTS idx_clients_tontineCollector ON clients(tontineCollector);

        -- ==========================================
        -- TABLES TONTINE
        -- ==========================================

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
            frequency TEXT,
            amount REAL,
            notes TEXT,
            FOREIGN KEY(tontineSessionId) REFERENCES tontine_sessions(id)
            -- IMPORTANT:
            -- On ne met plus de contrainte FOREIGN KEY(clientId) ici, car l'ID du client
            -- est réécrit (passage de l'ID local à l'ID serveur) lors de la synchronisation.
            -- Avec une contrainte active et non différée, toute tentative de mise à jour
            -- atomique (UPDATE sur clients + mises à jour des enfants) provoque une erreur
            -- de type "FOREIGN KEY constraint failed". L'intégrité est gérée applicativement
            -- via les mises à jour coordonnées dans SynchronizationService.markClientAsSynced.
        );

            -- Table des collectes de tontine
        CREATE TABLE IF NOT EXISTS tontine_collections (
            id TEXT PRIMARY KEY,
            tontineMemberId TEXT,
            amount REAL,
            collectionDate TEXT,
            commercialUsername TEXT,
            isLocal BOOLEAN DEFAULT 0,
            isSync BOOLEAN DEFAULT 0,
            syncDate DATETIME,
            syncHash TEXT,
            isDeliveryCollection BOOLEAN DEFAULT 0
            -- IMPORTANT:
            -- Pas de contrainte FOREIGN KEY(tontineMemberId) ici pour éviter les erreurs
            -- lors du passage de l'ID membre de tontine local à l'ID serveur pendant la synchro.
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
            syncHash TEXT
            -- IMPORTANT:
            -- Pas de contrainte FOREIGN KEY(tontineMemberId) ici non plus, même raison que ci-dessus.
        );

        -- Table des articles de livraison de tontine
        CREATE TABLE IF NOT EXISTS tontine_delivery_items (
            id TEXT PRIMARY KEY,
            tontineDeliveryId TEXT,
            articleId TEXT,
            quantity INTEGER,
            unitPrice REAL,
            totalPrice REAL
            -- IMPORTANT:
            -- Pas de contrainte FOREIGN KEY(tontineDeliveryId) ici, pour les mêmes
            -- raisons que pour tontine_collections / tontine_deliveries : l'ID de la
            -- livraison est réécrit (local -> serveur) lors de la synchro. Avec une FK
            -- non différée, la mise à jour atomique provoque des erreurs de type
            -- "FOREIGN KEY constraint failed". L'intégrité est assurée applicativement.
            ,
            FOREIGN KEY(articleId) REFERENCES articles(id)
        );

        -- Table des stocks de tontine
        CREATE TABLE IF NOT EXISTS tontine_stocks (
            id TEXT PRIMARY KEY,
            commercial TEXT,
            creditId TEXT,
            articleId TEXT,
            articleName TEXT,
            unitPrice REAL,
            totalQuantity INTEGER,
            availableQuantity INTEGER,
            distributedQuantity INTEGER,
            year INTEGER,
            tontineSessionId TEXT,
            FOREIGN KEY(tontineSessionId) REFERENCES tontine_sessions(id),
            FOREIGN KEY(articleId) REFERENCES articles(id)
        );
    `;

    await this.db?.execute(createTables);
  }

  private async verifyTables(): Promise<void> {
    try {
      const expectedTables = ['users', 'commercials', 'articles', 'localities', 'clients', 'accounts', 'stock_outputs', 'stock_output_items', 'distributions', 'distribution_items', 'orders', 'order_items', 'recoveries', 'sync_logs', 'daily_reports', 'tontine_sessions', 'tontine_members', 'tontine_collections', 'tontine_deliveries', 'tontine_delivery_items', 'commercial_stock_items'];
      const result = await this.db?.query(`SELECT name FROM sqlite_master WHERE type='table'`);
      const existingTables = result?.values?.map(row => row.name) || [];
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));

      if (missingTables.length > 0) {
        console.error(`Database verification failed. Missing tables: ${missingTables.join(', ')}`);
      } else {
        console.log('Database tables verified successfully.');
      }
    } catch (error) {
      console.error('Error verifying database tables:', error);
    }
  }

  // Méthodes wrapper pour les services de synchronisation
  async execute(sql: string, params?: any[]): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }
    return await this.db.run(sql, params || []);
  }

  async executeSet(sqlSet: capSQLiteSet[]): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }
    return await this.db.executeSet(sqlSet);
  }

  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }
    return await this.db.query(sql, params);
  }

  async saveArticles(articles: any[]): Promise<void> {
    this.log.log(`SAVE ARTICLES CALL ${new Date().toISOString()}`);
    if (!this.db) {
      this.log.log('Database not initialized.');
      throw new Error('Database not initialized.');
    }

    const keysToInclude = [
      'id', 'name', 'commercialName', 'creditSalePrice', 'stockQuantity'
    ];

    const existingRows = await this.db.query('SELECT id, syncHash FROM articles');
    const existingArticleMap = new Map<string, string>(
      existingRows.values?.map(row => [String(row.id), row.syncHash]) ?? []
    );

    const articlesToInsert: any[][] = [];
    const articlesToUpdate: any[][] = [];

    const processedIds = new Set<string>();

    const now = new Date().toISOString();

    for (const article of articles) {
      if (!article || article.id === undefined || article.id === null) {
        this.log.log(`Skipping article with no ID: ${JSON.stringify(article)}`);
        continue;
      }

      const articleIdStr = String(article.id);

      if (processedIds.has(articleIdStr)) {
        this.log.log(`ID déjà traité: ${articleIdStr}`);
        continue;
      }

      const newHash = this.generateHash(article, keysToInclude);
      const isExisting = existingArticleMap.has(articleIdStr);
      const needsUpdate = isExisting && existingArticleMap.get(articleIdStr) !== newHash;

      if (needsUpdate) {
        const updateParams = [
          article.name, article.commercialName, article.marque, article.model,
          article.type, article.creditSalePrice, article.stockQuantity,
          1, now, newHash, articleIdStr
        ];
        articlesToUpdate.push(updateParams);
        processedIds.add(articleIdStr);
      } else if (!isExisting) {
        const insertParams = [
          articleIdStr, article.name, article.commercialName, article.marque,
          article.model, article.type, article.creditSalePrice,
          article.stockQuantity, 1, now, newHash
        ];
        articlesToInsert.push(insertParams);
        processedIds.add(articleIdStr);
      }
    }

    try {
      if (articlesToUpdate.length > 0) {
        const updateSet: capSQLiteSet[] = [];
        const sql = `UPDATE articles SET
                    name = ?, commercialName = ?, marque = ?, model = ?,
                    type = ?, creditSalePrice = ?, stockQuantity = ?,
                    isSync = ?, lastUpdate = ?, syncHash = ?
                   WHERE id = ?`;
        for (const params of articlesToUpdate) {
          updateSet.push({ statement: sql, values: params });
        }
        await this.db.executeSet(updateSet);
      }

      if (articlesToInsert.length > 0) {
        const insertSet: capSQLiteSet[] = [];
        const sql = `INSERT INTO articles (
                    id, name, commercialName, marque, model, type,
                    creditSalePrice, stockQuantity, isSync, lastUpdate, syncHash
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        for (const params of articlesToInsert) {
          insertSet.push({ statement: sql, values: params });
        }
        await this.db.executeSet(insertSet);
      }

      const totalAffected = articlesToInsert.length + articlesToUpdate.length;
      if (totalAffected > 0) {
        this.log.log(`Successfully saved ${totalAffected} articles.`);
      }
    } catch (error: any) {
      this.log.log(`Failed to save articles in transaction. ${error.message}`);
      console.error('Failed to save articles in transaction.', error);
      throw error;
    }
  }


  async getArticles(): Promise<Article[]> {
    if (!this.db) {
      this.log.log('Database not initialized.');
      console.error('Database not initialized.');
      return [];
    }
    const ret = await this.db.query('SELECT * FROM articles');
    return ret.values || [];
  }

  async saveLocalities(localities: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    // 1. Clés pour le hash de comparaison
    const keysToInclude = ['id', 'name'];

    // 2. Préparation des données en une seule passe
    const existingRows = await this.db.query('SELECT id, syncHash FROM localities');
    const existingLocalityMap = new Map<string, string>(
      existingRows.values?.map(row => [row.id, row.syncHash]) ?? []
    );

    const localitiesToInsert: any[][] = [];
    const localitiesToUpdate: any[][] = [];

    // 3. Boucle de préparation, sans requêtes à la base de données
    for (const locality of localities) {
      if (!locality || locality.id === undefined || locality.id === null) {
        console.warn('Skipping locality with no ID:', locality);
        continue;
      }
      const newHash = this.generateHash(locality, keysToInclude);
      const isExisting = existingLocalityMap.has(locality.id);
      const needsUpdate = isExisting && existingLocalityMap.get(locality.id) !== newHash;

      // Les valeurs 'Maritime' et '1' sont conservées car elles semblent intentionnelles
      const REGION = 'Maritime';
      const IS_ACTIVE = 1;

      if (needsUpdate) {
        const sql = `UPDATE localities SET name = ?, region = ?, isActive = ?, syncHash = ?, isSync = ?, syncDate = ? WHERE id = ?`;
        const updateParams = [
          locality.name,
          REGION,
          IS_ACTIVE,
          newHash,
          locality.id // Pour la clause WHERE
        ];
        localitiesToUpdate.push(updateParams);
      } else if (!isExisting) {

        const insertParams = [
          locality.id,
          locality.name,
          REGION,
          IS_ACTIVE,
          newHash,
          locality.isLocal ? 1 : 0,
          locality.isSync ? 1 : 0,
          new Date().toISOString(),
          locality.createdAt ?? new Date().toISOString()
        ];
        localitiesToInsert.push(insertParams);
      }
    }

    // 4. Exécution en batch dans une transaction
    try {
      // La gestion de transaction dépend de votre librairie (ex: this.db.beginTransaction())
      if (localitiesToUpdate.length > 0) {
        const sql = `UPDATE localities SET name = ?, region = ?, isActive = ?, syncHash = ? WHERE id = ?`;
        await this.db.run(sql, localitiesToUpdate);
      }

      if (localitiesToInsert.length > 0) {
        const sql = `INSERT INTO localities (id, name, region, isActive, syncHash, isLocal, isSync, syncDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        for (const params of localitiesToInsert) {
          await this.db.run(sql, params);
        }
      }

      const totalAffected = localitiesToInsert.length + localitiesToUpdate.length;
      if (totalAffected > 0) {
        console.log(`Successfully saved ${totalAffected} localities.`);
      }
    } catch (error) {
      console.error('Failed to save localities in transaction. Rolling back.', error);
      throw error;
    }
  }

  async getLocalities(): Promise<Locality[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const ret = await this.db.query('SELECT * FROM localities ORDER BY createdAt DESC');
    return ret.values || [];
  }

  async addLocality(locality: Pick<Locality, 'name'>): Promise<Locality> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }
    const newId = this.generateUuid();
    const createdAt = new Date().toISOString();
    const sql = `INSERT INTO localities (id, name, createdAt, isLocal, isSync) VALUES (?, ?, ?, 1, 0)`;
    await this.db.run(sql, [newId, locality.name, createdAt]);
    return { id: newId, name: locality.name, createdAt: createdAt, isLocal: true, isSync: false };
  }

  async getUnsyncedLocalities(): Promise<Locality[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const sql = `SELECT * FROM localities WHERE isSync = 0 AND isLocal = 1`;
    const ret = await this.db.query(sql);
    return ret.values || [];
  }

  async markLocalityAsSynced(localId: string, serverId: number): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized.');
      return;
    }
    const now = new Date().toISOString();
    const updateSql = `UPDATE localities SET isSync = 1, isLocal = 0, syncDate = ? WHERE id = ?`;
    await this.db.run(updateSql, [now, localId]);

    const mappingSql = `INSERT INTO id_mappings (localId, serverId, entityType) VALUES (?, ?, 'locality')`;
    await this.db.run(mappingSql, [localId, serverId.toString()]);

    console.log(`Locality ${localId} marked as synced with server ID ${serverId}.`);
  }



  async saveClients(clients: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    // L'étape de préparation des données est correcte, nous la gardons
    const keysToInclude = ['id', 'firstname', 'lastname', 'phone', 'address', 'dateOfBirth', 'occupation', 'clientType', 'cardType', 'cardID', 'quarter', 'commercial', 'latitude', 'longitude', 'mll', 'contactPersonName', 'contactPersonPhone', 'contactPersonAddress', 'code', 'creditInProgress', 'profilPhotoUrl', 'cardPhotoUrl', 'tontineCollector'];
    const existingRows = await this.db.query('SELECT id, syncHash FROM clients');
    const existingClientMap = new Map<string, string>(
      existingRows.values?.map(row => [String(row.id), row.syncHash]) ?? []
    );

    const clientsToInsert: capSQLiteSet[] = []; // <-- Changer le type
    const clientsToUpdate: capSQLiteSet[] = []; // <-- Changer le type
    const now = new Date().toISOString();

    for (const client of clients) {
      const localClient = ClientMapper.toLocal(client);
      if (!localClient.id) { continue; }
      const clientIdStr = String(localClient.id);

      const newHash = this.generateHash(localClient, keysToInclude);
      const isExisting = existingClientMap.has(clientIdStr);
      const needsUpdate = isExisting && existingClientMap.has(clientIdStr) && existingClientMap.get(clientIdStr) !== newHash;

      if (needsUpdate) {
        const sql = `UPDATE clients SET firstname = ?, lastname = ?, fullName = ?, phone = ?, address = ?, dateOfBirth = ?, occupation = ?, clientType = ?, cardType = ?, cardID = ?, quarter = ?, commercial = ?, isLocal = ?, isSync = ?, syncDate = ?, syncHash = ?, latitude = ?, longitude = ?, mll = ?, contactPersonName = ?, contactPersonPhone = ?, contactPersonAddress = ?, code = ?, profilPhoto = ?, creditInProgress = ?, cardPhoto = ?, profilPhotoUrl = ?, cardPhotoUrl = ?, updatedPhotoUrl = ?, tontineCollector = ? WHERE id = ?`;
        const updateParams = [
          localClient.firstname ?? null, localClient.lastname ?? null, localClient.fullName ?? null,
          localClient.phone ?? null, localClient.address ?? null, localClient.dateOfBirth ?? null,
          localClient.occupation ?? null, localClient.clientType ?? null, localClient.cardType ?? null,
          localClient.cardID ?? null, localClient.quarter ?? null, localClient.commercial ?? null,
          localClient.isLocal ? 1 : 0, localClient.isSync ? 1 : 0, // <-- CORRECTION BOOLEAN
          now, newHash, localClient.latitude ?? 0, localClient.longitude ?? 0,
          localClient.mll ?? null, localClient.contactPersonName ?? null, localClient.contactPersonPhone ?? null,
          localClient.contactPersonAddress ?? null, localClient.code ?? null, localClient.profilPhoto ?? null,
          localClient.creditInProgress ? 1 : 0, localClient.cardPhoto ?? null, // <-- CORRECTION BOOLEAN
          localClient.profilPhotoUrl ?? null, localClient.cardPhotoUrl ?? null, localClient.updatedPhotoUrl ? 1 : 0,
          localClient.tontineCollector ?? null,
          clientIdStr
        ];
        clientsToUpdate.push({ statement: sql, values: updateParams });

      } else if (!isExisting) {
        const sql = `INSERT INTO clients (id, firstname, lastname, fullName, phone, address, dateOfBirth, occupation, clientType, cardType, cardID, quarter, commercial, isLocal, isSync, syncDate, syncHash, latitude, longitude, mll, contactPersonName, contactPersonPhone, contactPersonAddress, code, profilPhoto, creditInProgress, cardPhoto, profilPhotoUrl, cardPhotoUrl, updatedPhotoUrl, tontineCollector, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const insertParams = [
          clientIdStr, localClient.firstname ?? null, localClient.lastname ?? null, localClient.fullName ?? null,
          localClient.phone ?? null, localClient.address ?? null, localClient.dateOfBirth ?? null,
          localClient.occupation ?? null, localClient.clientType ?? null, localClient.cardType ?? null,
          localClient.cardID ?? null, localClient.quarter ?? null, localClient.commercial ?? null,
          localClient.isLocal ? 1 : 0, localClient.isSync ? 1 : 0, // <-- CORRECTION BOOLEAN
          now, newHash, localClient.latitude ?? 0, localClient.longitude ?? 0,
          localClient.mll ?? null, localClient.contactPersonName ?? null, localClient.contactPersonPhone ?? null,
          localClient.contactPersonAddress ?? null, localClient.code ?? null, localClient.profilPhoto ?? null,
          localClient.creditInProgress ? 1 : 0, localClient.cardPhoto ?? null, // <-- CORRECTION BOOLEAN
          localClient.profilPhotoUrl ?? null, localClient.cardPhotoUrl ?? null, localClient.updatedPhotoUrl ? 1 : 0,
          localClient.tontineCollector ?? null,
          localClient.createdAt ?? new Date()
        ];
        clientsToInsert.push({ statement: sql, values: insertParams });
      }
    }

    // *** CORRECTION DU BLOC D'EXÉCUTION ***
    try {
      if (clientsToUpdate.length > 0) {
        await this.db.executeSet(clientsToUpdate);
      }

      if (clientsToInsert.length > 0) {
        await this.db.executeSet(clientsToInsert);
      }

      const totalAffected = clientsToInsert.length + clientsToUpdate.length;
      if (totalAffected > 0) {
        console.log(`Successfully saved ${totalAffected} clients.`);
      }

    } catch (error) {
      console.error('Failed to save clients in transaction. Rolling back.', error);
      throw error;
    }
  }

  async getClients(commercialId: string): Promise<Client[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const ret = await this.db.query('SELECT * FROM clients WHERE commercial = ?', [commercialId]);
    this.log.log(`[DatabaseService] getClients: Query finished for commercial ${commercialId}. Found ${ret.values?.length} clients.`);
    return ret.values || [];
  }

  async saveCommercial(commercial: any): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized.');
      return;
    }
    const keysToInclude = ['id', 'username', 'firstname', 'lastname', 'gender', 'phone', 'email'];
    const newHash = this.generateHash(commercial, keysToInclude);
    const existingCommercial = await this.db.query(`SELECT syncHash FROM commercials WHERE id = ${commercial.id}`);
    const existingHash = existingCommercial.values?.[0]?.syncHash;

    if (existingHash !== undefined) {
      if (existingHash !== newHash) {
        const sql = `UPDATE commercials SET username = ?, fullName = ?, email = ?, phone = ?, profilePhoto = ?, isSync = 1, syncDate = ?, syncHash = ? WHERE id = ?`;
        await this.db.run(sql, [commercial.username, `${commercial.firstname} ${commercial.lastname}`, commercial.email, commercial.phone, commercial.profil?.url, new Date().toISOString(), newHash, commercial.id]);
      }
    } else {
      const existingCommercial = await this.db.query(`SELECT id FROM commercials WHERE id = ${commercial.id}`);
      if (existingCommercial.values && existingCommercial.values.length > 0) {
        const sql = `UPDATE commercials SET username = ?, fullName = ?, email = ?, phone = ?, profilePhoto = ?, isSync = 1, syncDate = ?, syncHash = ? WHERE id = ?`;
        await this.db.run(sql, [commercial.username, `${commercial.firstname} ${commercial.lastname}`, commercial.email, commercial.phone, commercial.profil?.url, new Date().toISOString(), newHash, commercial.id]);
      } else {
        const sql = `INSERT INTO commercials (id, username, fullName, email, phone, profilePhoto, isSync, syncDate, syncHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await this.db.run(sql, [commercial.id, commercial.username, `${commercial.firstname} ${commercial.lastname}`, commercial.email, commercial.phone, commercial.profil?.url, 1, new Date().toISOString(), newHash]);
      }
    }
    console.log(`Upserted commercial ${commercial.username} to local database.`);
  }

  async saveDailyReport(reportData: any, commercialId: string): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const reportId = `${commercialId}-${today}`;

    const existingReport = await this.db.query(`SELECT id FROM daily_reports WHERE id = ?`, [reportId]);

    const params = [
      reportData.distributions.count,
      reportData.distributions.totalAmount,
      reportData.recoveries.count,
      reportData.recoveries.totalAmount,
      reportData.newClients.count,
      reportData.newClients.totalBalance,
      JSON.stringify(reportData),
      1, // isPrinted
      new Date().toISOString()
    ];

    if (existingReport.values && existingReport.values.length > 0) {
      // Update
      const sql = `UPDATE daily_reports SET
                    totalDistributions = ?,
                    totalDistributionAmount = ?,
                    totalRecoveries = ?,
                    totalRecoveryAmount = ?,
                    newClients = ?,
                    clientsInitialTotalBalance = ?,
                    reportData = ?,
                    isPrinted = ?,
                    createdAt = ?
                   WHERE id = ?`;
      await this.db.run(sql, [...params, reportId]);
      console.log(`Daily report updated for date: ${today}`);
    } else {
      // Insert
      const sql = `INSERT INTO daily_reports (
                    id, date, commercialId, totalDistributions, totalDistributionAmount,
                    totalRecoveries, totalRecoveryAmount, newClients, clientsInitialTotalBalance,
                    reportData, isPrinted, createdAt
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      await this.db.run(sql, [reportId, today, commercialId, ...params]);
      console.log(`Daily report saved for date: ${today}`);
    }
  }

  async getCommercial(): Promise<Commercial | null> {
    if (!this.db) {
      console.error('Database not initialized.');
      return null;
    }
    const ret = await this.db.query('SELECT * FROM commercials LIMIT 1');
    return ret.values && ret.values.length > 0 ? ret.values[0] : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    if (!this.db) {
      console.error('Database not initialized.');
      return null;
    }
    const sql = `SELECT * FROM users WHERE username = ?`;
    const ret = await this.db.query(sql, [username]);
    return ret.values && ret.values.length > 0 ? ret.values[0] : null;
  }

  async saveStockOutputs(stockOutputs: StockOutput[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    // 1. Clés pour le hash (cohérentes avec le modèle local)
    const keysToInclude = ['id', 'reference', 'status', 'updatable', 'totalAmount', 'createdAt', 'commercialId'];

    // 2. Préparation des données en une seule passe
    const existingRows = await this.db.query('SELECT id, syncHash FROM stock_outputs');
    // **Amélioration : Forcer la conversion en String pour la robustesse**
    const existingOutputMap = new Map<string, string>(
      existingRows.values?.map(row => [String(row.id), row.syncHash]) ?? []
    );

    const outputsToInsert: any[][] = [];
    const outputsToUpdate: any[][] = [];
    const allItemsToInsert: any[][] = [];
    const outputIdsToClearItems: string[] = [];
    const now = new Date().toISOString();

    for (const so of stockOutputs) {
      const soLocal = StockOutputMapper.toLocal(so);
      const soIdStr = String(soLocal.id); // **Amélioration**
      if (!soIdStr) {
        console.warn('Skipping stock output with no ID:', so);
        continue;
      }

      const newHash = this.generateHash(soLocal, keysToInclude);
      const isExisting = existingOutputMap.has(soIdStr); // **Amélioration**
      const needsUpdate = isExisting && existingOutputMap.get(soIdStr) !== newHash;

      if (!isExisting || needsUpdate) {
        if (needsUpdate) {
          outputIdsToClearItems.push(soIdStr);
          // **Amélioration : Paramètres robustes**
          const updateParams = [
            soLocal.reference ?? null,
            soLocal.status ?? null,
            soLocal.updatable ? 1 : 0,
            soLocal.totalAmount ?? 0,
            soLocal.createdAt ?? now,
            soLocal.commercialId ?? null,
            1, now, newHash, soIdStr
          ];
          outputsToUpdate.push(updateParams);
        } else {
          // **Amélioration : Paramètres robustes**
          const insertParams = [
            soIdStr,
            soLocal.reference ?? null,
            soLocal.status ?? null,
            soLocal.updatable ? 1 : 0,
            soLocal.totalAmount ?? 0,
            soLocal.createdAt ?? now,
            soLocal.commercialId ?? null,
            1, now, newHash
          ];
          outputsToInsert.push(insertParams);
        }

        for (const item of soLocal?.items || []) {
          // **Amélioration : Paramètres robustes**
          allItemsToInsert.push([
            item.id ?? null,
            item.stockOutputId ?? soIdStr,
            item.articleId ?? null,
            item.quantity ?? 0,
            item.unitPrice ?? 0,
            item.totalPrice ?? 0
          ]);
        }
      }
    }

    // 3. Exécution de toutes les requêtes
    try {
      // Étape A: Supprimer les anciens items. 'db.run' est correct ici car ce n'est pas un batch de la même manière.
      if (outputIdsToClearItems.length > 0) {
        const placeholders = outputIdsToClearItems.map(() => '?').join(',');
        const sql = `DELETE FROM stock_output_items WHERE stockOutputId IN (${placeholders})`;
        await this.db.run(sql, outputIdsToClearItems);
      }

      // **Amélioration : Utilisation de db.executeSet pour les batchs**
      // Étape B: Mettre à jour les sorties de stock
      if (outputsToUpdate.length > 0) {
        const updateSet: capSQLiteSet[] = [];
        const sql = `UPDATE stock_outputs SET reference = ?, status = ?, updatable = ?, totalAmount = ?, createdAt = ?, commercialId = ?, isSync = ?, syncDate = ?, syncHash = ? WHERE id = ?`;
        for (const params of outputsToUpdate) {
          updateSet.push({ statement: sql, values: params });
        }
        await this.db.executeSet(updateSet);
      }

      // Étape C: Insérer les nouvelles sorties de stock
      if (outputsToInsert.length > 0) {
        const insertSet: capSQLiteSet[] = [];
        const sql = `INSERT INTO stock_outputs (id, reference, status, updatable, totalAmount, createdAt, commercialId, isSync, syncDate, syncHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        for (const params of outputsToInsert) {
          insertSet.push({ statement: sql, values: params });
        }
        await this.db.executeSet(insertSet);
      }

      // Étape D: Insérer tous les nouveaux items
      if (allItemsToInsert.length > 0) {
        const insertItemsSet: capSQLiteSet[] = [];
        const sql = `INSERT INTO stock_output_items (id, stockOutputId, articleId, quantity, unitPrice, totalPrice) VALUES (?, ?, ?, ?, ?, ?)`;
        for (const params of allItemsToInsert) {
          insertItemsSet.push({ statement: sql, values: params });
        }
        await this.db.executeSet(insertItemsSet);
      }

      const totalAffected = outputsToInsert.length + outputsToUpdate.length;
      if (totalAffected > 0) {
        console.log(`Successfully saved ${totalAffected} stock outputs and their items.`);
      }

    } catch (error) {
      console.error('Failed to save stock outputs in transaction. Rolling back.', error);
      throw error;
    }
  }

  async getStockOutputs(): Promise<StockOutput[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const ret = await this.db.query('SELECT * FROM stock_outputs');
    return ret.values || [];
  }

  async getStockOutputItems(): Promise<any[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const ret = await this.db.query('SELECT * FROM stock_output_items');
    return ret.values || [];
  }

  async getStockOutputsByStatus(status: string): Promise<StockOutput[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const sql = `SELECT * FROM stock_outputs WHERE status = ?`;
    const ret = await this.db.query(sql, [status]);
    return ret.values || [];
  }

  async getStockOutputItemsByStockId(stockOutputId: string): Promise<StockOutputItem[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const sql = `SELECT * FROM stock_output_items WHERE stockOutputId = ?`;
    const ret = await this.db.query(sql, [stockOutputId]);
    return ret.values || [];
  }

  async saveDistributionsAndItems(distributions: Distribution[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    // === ÉTAPE 1: PRÉPARATION ===
    const keysToInclude = ['id', 'reference', 'totalAmount', 'dailyPayment', 'startDate', 'endDate', 'status'];
    const existingRows = await this.db.query('SELECT id, syncHash FROM distributions');

    // *** LA LIGNE CORRIGÉE ***
    // On s'assure que .map retourne une paire [clé, valeur] et on type 'row'.
    const existingDistributionMap = new Map<string, string>(
      existingRows.values?.map((row: DbRowWithHash) => [String(row.id), row.syncHash]) ?? []
    );

    const distributionsToUpdate: capSQLiteSet[] = [];
    const distributionsToInsert: capSQLiteSet[] = [];
    const allItemsToInsert: capSQLiteSet[] = [];
    const distributionIdsToClearItems: string[] = [];
    const now = new Date().toISOString();

    for (const dist of distributions) {
      const localDist = DistributionMapper.toLocal(dist);
      const distIdStr = String(localDist.id);
      if (!distIdStr) { continue; }

      const newHash = this.generateHash(dist, keysToInclude);
      const isExisting = existingDistributionMap.has(distIdStr);
      const needsUpdate = isExisting && existingDistributionMap.get(distIdStr) !== newHash;

      if (isExisting && !needsUpdate) {
        continue;
      }

      // Si une distribution est mise à jour, on supprime TOUJOURS ses anciens items.
      if (needsUpdate) {
        distributionIdsToClearItems.push(distIdStr);
      }

      if (needsUpdate) {
        const sql = `UPDATE distributions SET reference=?, creditId=?, totalAmount=?, dailyPayment=?, startDate=?, endDate=?, status=?, clientId=?, commercialId=?, isLocal=?, isSync=?, syncDate=?, createdAt=?, syncHash=?, articleCount=?, remainingAmount=?, paidAmount=?, advance=? WHERE id=?`;
        distributionsToUpdate.push({
          statement: sql,
          values: [
            localDist.reference ?? null, localDist.creditId ?? null, localDist.totalAmount ?? 0,
            localDist.dailyPayment ?? 0, localDist.startDate ?? null, localDist.endDate ?? null,
            localDist.status ?? null, localDist.clientId ?? null, localDist.commercialId ?? null,
            localDist.isLocal ? 1 : 0, localDist.isSync ? 1 : 0, now,
            localDist.createdAt ?? now, newHash, localDist.articleCount ?? 0,
            localDist.remainingAmount ?? localDist.totalAmount ?? 0,
            localDist.paidAmount ?? 0, localDist.advance ?? 0, distIdStr
          ]
        });
      } else if (!isExisting) {
        const sql = `INSERT INTO distributions (id, reference, creditId, totalAmount, dailyPayment, startDate, endDate, status, clientId, commercialId, isLocal, isSync, syncDate, createdAt, syncHash, articleCount, remainingAmount, paidAmount, advance) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        distributionsToInsert.push({
          statement: sql,
          values: [
            distIdStr, localDist.reference ?? null, localDist.creditId ?? null, localDist.totalAmount ?? 0,
            localDist.dailyPayment ?? 0, localDist.startDate ?? null, localDist.endDate ?? null,
            localDist.status ?? null, localDist.clientId ?? null, localDist.commercialId ?? null,
            localDist.isLocal ? 1 : 0, localDist.isSync ? 1 : 0, now,
            localDist.createdAt ?? now, newHash, localDist.articleCount ?? 0,
            localDist.remainingAmount ?? localDist.totalAmount ?? 0,
            localDist.paidAmount ?? 0, localDist.advance ?? 0
          ]
        });
      }

      if (localDist.items && localDist.items.length > 0) {
        const sql = `INSERT INTO distribution_items (id, distributionId, articleId, quantity, unitPrice, totalPrice) VALUES (?,?,?,?,?,?)`;
        for (const item of localDist.items) {
          allItemsToInsert.push({
            statement: sql,
            values: [
              item.id ?? this.generateUuid(),
              distIdStr,
              item.articleId ?? null,
              item.quantity ?? 0,
              item.unitPrice ?? 0,
              item.totalPrice ?? 0
            ]
          });
        }
      }
    }

    // === ÉTAPE 2: EXÉCUTION ===
    try {
      if (distributionIdsToClearItems.length > 0) {
        const placeholders = distributionIdsToClearItems.map(() => '?').join(',');
        const sql = `DELETE FROM distribution_items WHERE distributionId IN (${placeholders})`;
        await this.db.run(sql, distributionIdsToClearItems);
      }

      if (distributionsToUpdate.length > 0) {
        await this.db.executeSet(distributionsToUpdate);
      }

      if (distributionsToInsert.length > 0) {
        await this.db.executeSet(distributionsToInsert);
      }

      if (allItemsToInsert.length > 0) {
        await this.db.executeSet(allItemsToInsert);
      }

      console.log(`Successfully saved ${distributions.length} distributions and their items.`);

    } catch (error) {
      console.error('Failed to save distributions and items in transaction.', error);
      throw error;
    }
  }

  async saveDistributions(distributions: Distribution[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    const keysToInclude = ['id', 'reference', 'totalAmount', 'dailyPayment', 'startDate', 'endDate', 'status'];

    // **Amélioration : Forcer la conversion en String pour la robustesse**
    const existingRows = await this.db.query('SELECT id, syncHash FROM distributions');
    const existingDistributionMap = new Map<string, string>(
      existingRows.values?.map(row => [String(row.id), row.syncHash]) ?? []
    );

    const distributionsToInsert: capSQLiteSet[] = []; // <-- Changer le type
    const distributionsToUpdate: capSQLiteSet[] = []; // <-- Changer le type
    const now = new Date().toISOString();

    for (const dist of distributions) {
      const localDist = DistributionMapper.toLocal(dist);
      const distIdStr = String(localDist.id); // **Amélioration**

      if (!distIdStr) {
        console.warn('Skipping distribution with no ID:', dist);
        continue;
      }

      const newHash = this.generateHash(dist, keysToInclude);
      const isExisting = existingDistributionMap.has(distIdStr); // **Amélioration**
      const needsUpdate = isExisting && existingDistributionMap.get(distIdStr) !== newHash;

      if (needsUpdate) {
        const sql = `UPDATE distributions SET reference = ?, creditId = ?, totalAmount = ?, dailyPayment = ?, startDate = ?, endDate = ?, status = ?, clientId = ?, commercialId = ?, isLocal = ?, isSync = ?, syncDate = ?, createdAt = ?, syncHash = ?, articleCount = ?, remainingAmount = ?, paidAmount = ?, advance = ? WHERE id = ?`;
        // **Amélioration : Paramètres robustes**
        const updateParams = [
          localDist.reference ?? null,
          localDist.creditId ?? null,
          localDist.totalAmount ?? 0,
          localDist.dailyPayment ?? 0,
          localDist.startDate ?? null,
          localDist.endDate ?? null,
          localDist.status ?? null,
          localDist.clientId ?? null,
          localDist.commercialId ?? null,
          localDist.isLocal ? 1 : 0,
          localDist.isSync ? 1 : 0,
          now,
          localDist.createdAt ?? now,
          newHash,
          localDist.articleCount ?? 0,
          localDist.remainingAmount ?? localDist.totalAmount ?? 0,
          localDist.paidAmount ?? 0,
          localDist.advance ?? 0,
          distIdStr
        ];
        distributionsToUpdate.push({ statement: sql, values: updateParams });

      } else if (!isExisting) {
        const sql = `INSERT INTO distributions (id, reference, creditId, totalAmount, dailyPayment, startDate, endDate, status, clientId, commercialId, isLocal, isSync, syncDate, createdAt, syncHash, articleCount, remainingAmount, paidAmount, advance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        // **Amélioration : Paramètres robustes**
        const insertParams = [
          distIdStr,
          localDist.reference ?? null,
          localDist.creditId ?? null,
          localDist.totalAmount ?? 0,
          localDist.dailyPayment ?? 0,
          localDist.startDate ?? null,
          localDist.endDate ?? null,
          localDist.status ?? null,
          localDist.clientId ?? null,
          localDist.commercialId ?? null,
          localDist.isLocal ? 1 : 0,
          localDist.isSync ? 1 : 0,
          now,
          localDist.createdAt ?? now,
          newHash,
          localDist.articleCount ?? 0,
          localDist.remainingAmount ?? localDist.totalAmount ?? 0,
          localDist.paidAmount ?? 0,
          localDist.advance ?? 0
        ];
        distributionsToInsert.push({ statement: sql, values: insertParams });
      }
    }

    // **Amélioration : Exécution en batch avec executeSet**
    try {
      if (distributionsToUpdate.length > 0) {
        await this.db.executeSet(distributionsToUpdate);
      }

      if (distributionsToInsert.length > 0) {
        await this.db.executeSet(distributionsToInsert);
      }

      const count = distributionsToInsert.length + distributionsToUpdate.length;
      if (count > 0) {
        console.log(`Successfully saved ${count} distributions.`);
      }

    } catch (error) {
      console.error('Failed to save distributions in transaction.', error);
      throw error;
    }
  }

  async getDistributions(commercialId: string): Promise<Distribution[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const ret = await this.db.query('SELECT * FROM distributions WHERE commercialId = ?', [commercialId]);
    return ret.values || [];
  }

  /**
   * Sauvegarde une liste d'articles de distribution.
   * Met à jour les articles existants et insère les nouveaux, sans suppression préalable.
   */
  async saveDistributionItems(items: DistributionItem[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    // 1. Récupérer les IDs de tous les articles existants en une seule fois
    const existingRows = await this.db.query('SELECT id FROM distribution_items');
    const existingItemIds = new Set<string>(
      existingRows.values?.map(row => String(row.id)) ?? []
    );

    const itemsToInsert: capSQLiteSet[] = []; // <-- Utiliser le type correct
    const itemsToUpdate: capSQLiteSet[] = []; // <-- Utiliser le type correct

    // 2. Trier les articles à insérer et ceux à mettre à jour
    for (const item of items) {
      if (!item || item.id === undefined) {
        console.warn('Skipping item with no ID:', item);
        continue;
      }
      const itemIdStr = String(item.id);

      if (existingItemIds.has(itemIdStr)) {
        // L'article existe : on prépare un UPDATE
        const sql = `UPDATE distribution_items SET distributionId = ?, articleId = ?, quantity = ?, unitPrice = ?, totalPrice = ? WHERE id = ?`;
        // **Amélioration : Paramètres robustes**
        const updateParams = [
          item.distributionId ?? null,
          item.articleId ?? null,
          item.quantity ?? 0,
          item.unitPrice ?? 0,
          item.totalPrice ?? 0,
          itemIdStr
        ];
        itemsToUpdate.push({ statement: sql, values: updateParams });

      } else {
        // L'article est nouveau : on prépare un INSERT
        const sql = `INSERT INTO distribution_items (id, distributionId, articleId, quantity, unitPrice, totalPrice) VALUES (?, ?, ?, ?, ?, ?)`;
        // **Amélioration : Paramètres robustes**
        const insertParams = [
          itemIdStr,
          item.distributionId ?? null,
          item.articleId ?? null,
          item.quantity ?? 0,
          item.unitPrice ?? 0,
          item.totalPrice ?? 0
        ];
        itemsToInsert.push({ statement: sql, values: insertParams });
      }
    }

    // 3. Exécuter les opérations en lot avec executeSet
    try {
      if (itemsToUpdate.length > 0) {
        await this.db.executeSet(itemsToUpdate);
      }

      if (itemsToInsert.length > 0) {
        await this.db.executeSet(itemsToInsert);
      }

      const totalAffected = itemsToInsert.length + itemsToUpdate.length;
      if (totalAffected > 0) {
        console.log(`Saved ${totalAffected} distribution items.`);
      }

    } catch (error) {
      console.error('Failed to save distribution items in transaction.', error);
      throw error;
    }
  }

  async getDistributionItems(): Promise<DistributionItem[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const ret = await this.db.query('SELECT * FROM distribution_items');
    return ret.values || [];
  }

  /**
   * Récupérer les articles pour une distribution spécifique.
   */
  async getItemsForDistribution(distributionId: string): Promise<DistributionItem[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const sql = `SELECT * FROM distribution_items WHERE distributionId = ?`;
    const ret = await this.db.query(sql, [distributionId]);
    return ret.values || [];
  }

  async saveAccounts(accounts: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    // 1. Clés pour le hash de comparaison
    const keysToInclude = ['id', 'accountNumber', 'accountBalance', 'status'];

    // 2. Préparation des données en une seule passe
    const existingRows = await this.db.query('SELECT id, syncHash FROM accounts');
    // **Amélioration : Forcer la conversion en String pour la robustesse**
    const existingAccountMap = new Map<string, string>(
      existingRows.values?.map(row => [String(row.id), row.syncHash]) ?? []
    );

    const accountsToInsert: capSQLiteSet[] = []; // <-- Changer le type
    const accountsToUpdate: capSQLiteSet[] = []; // <-- Changer le type
    const now = new Date().toISOString();

    // 3. Boucle de préparation : unification de la logique
    for (const acc of accounts) {
      if (!acc || acc.id === undefined) {
        console.warn('Skipping account with no ID:', acc);
        continue;
      }
      const accountIdStr = String(acc.id); // **Amélioration**

      const accountBalance = acc.accountBalance ?? acc.balance ?? 0;
      const clientId = acc.clientId ?? acc.client?.id;
      const clientIdStr = String(clientId);
      if (clientId === undefined) {
        console.warn('Skipping account with no clientId:', acc);
        continue;
      }

      const normalizedAcc = { ...acc, accountBalance, clientId };
      const newHash = this.generateHash(normalizedAcc, keysToInclude);

      const isExisting = existingAccountMap.has(accountIdStr); // **Amélioration**
      const needsUpdate = isExisting && existingAccountMap.get(accountIdStr) !== newHash;

      const isNumericId = /^[0-9]+$/.test(accountIdStr);
      const IS_SYNC = isNumericId ? 1 : 0;

      if (needsUpdate) {
        const sql = `UPDATE accounts SET accountNumber = ?, accountBalance = ?, status = ?, clientId = ?, isLocal = ?, isSync = ?, syncDate = ?, syncHash = ?, old_balance = ?, updated = ?, createdAt = ? WHERE id = ?`;
        const updateParams = [
          acc.accountNumber ?? null, // <-- Robuste
          accountBalance,
          acc.status ?? null, // <-- Robuste
          clientIdStr,
          acc.isLocal ? 1 : 0,
          IS_SYNC,
          now,
          newHash,
          acc.old_balance ?? null,
          acc.updated ? 1 : 0,
          acc.createdAt ?? now,
          accountIdStr
        ];
        accountsToUpdate.push({ statement: sql, values: updateParams });

      } else if (!isExisting) {
        const sql = `INSERT INTO accounts (id, accountNumber, accountBalance, status, clientId, isLocal, isSync, syncDate, syncHash, old_balance, updated, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const insertParams = [
          accountIdStr,
          acc.accountNumber ?? null, // <-- Robuste
          accountBalance,
          acc.status ?? null, // <-- Robuste
          clientIdStr,
          acc.isLocal ? 1 : 0,
          IS_SYNC,
          now,
          newHash,
          null,
          0,
          acc.createdAt ?? now
        ];
        accountsToInsert.push({ statement: sql, values: insertParams });
      }
    }

    // 4. Exécution en batch avec executeSet
    try {
      if (accountsToUpdate.length > 0) {
        await this.db.executeSet(accountsToUpdate);
      }

      if (accountsToInsert.length > 0) {
        await this.db.executeSet(accountsToInsert);
      }

      const totalAffected = accountsToInsert.length + accountsToUpdate.length;
      if (totalAffected > 0) {
        console.log(`Successfully saved ${totalAffected} accounts.`);
      }

    } catch (error) {
      console.error('Failed to save accounts in transaction. Rolling back.', error);
      throw error;
    }
  }

  async getAccounts(commercialId: string): Promise<Account[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const sql = `
      SELECT a.* FROM accounts a
      JOIN clients c ON a.clientId = c.id
      WHERE c.commercial = ?
    `;
    const ret = await this.db.query(sql, [commercialId]);
    return ret.values || [];
  }

  async saveRecoveries(recoveries: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    // 1. Clés pour le hash de comparaison
    const keysToInclude = ['id', 'amount', 'paymentDate', 'paymentMethod', 'notes', 'distributionId', 'clientId', 'commercialId'];

    // 2. Préparation des données en une seule passe
    const existingRows = await this.db.query('SELECT id, syncHash FROM recoveries');
    const existingRecoveryMap = new Map<string, string>(
      existingRows.values?.map(row => [String(row.id), row.syncHash]) ?? []
    );

    const recoveriesToInsert: capSQLiteSet[] = [];
    const recoveriesToUpdate: capSQLiteSet[] = [];
    const now = new Date().toISOString();

    // 3. Boucle de préparation
    for (const recovery of recoveries) {
      if (!recovery || recovery.id === undefined) {
        console.warn('Skipping recovery with no ID:', recovery);
        continue;
      }
      const recoveryIdStr = String(recovery.id);

      // On normalise les IDs imbriqués pour le hashage
      const normalizedRecovery = {
        ...recovery,
        distributionId: recovery.distribution?.id,
        clientId: recovery.client?.id,
        commercialId: recovery.commercialId
      };
      const newHash = this.generateHash(normalizedRecovery, keysToInclude);

      const isExisting = existingRecoveryMap.has(recoveryIdStr);
      const needsUpdate = isExisting && existingRecoveryMap.get(recoveryIdStr) !== newHash;

      const IS_LOCAL = 0; // Données venant du serveur
      const IS_SYNC = 1;

      if (needsUpdate) {
        const sql = `UPDATE recoveries SET amount = ?, paymentDate = ?, paymentMethod = ?, notes = ?, distributionId = ?, clientId = ?, commercialId = ?, isLocal = ?, isSync = ?, syncDate = ?, syncHash = ?, isDefaultStake = ? WHERE id = ?`;
        // **Amélioration : Paramètres robustes et accès sécurisé**
        const updateParams = [
          recovery.amount ?? 0,
          recovery.paymentDate ?? null,
          recovery.paymentMethod ?? null,
          recovery.notes ?? null,
          recovery.distribution?.id ?? null,
          recovery.client?.id ?? null,
          recovery.commercialId ?? null,
          IS_LOCAL,
          IS_SYNC,
          now,
          newHash,
          recovery.isDefaultStake ? 1 : 0,
          recoveryIdStr
        ];
        recoveriesToUpdate.push({ statement: sql, values: updateParams });

      } else if (!isExisting) {
        const sql = `INSERT INTO recoveries (id, amount, paymentDate, paymentMethod, notes, distributionId, clientId, commercialId, isLocal, isSync, syncDate, createdAt, syncHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        // **Amélioration : Paramètres robustes et accès sécurisé**
        const insertParams = [
          recoveryIdStr,
          recovery.amount ?? 0,
          recovery.paymentDate ?? null,
          recovery.paymentMethod ?? null,
          recovery.notes ?? null,
          recovery.distribution?.id ?? null,
          recovery.client?.id ?? null,
          recovery.commercialId ?? null,
          IS_LOCAL,
          IS_SYNC,
          now,
          recovery.paymentDate ?? now, // createdAt
          newHash
        ];
        recoveriesToInsert.push({ statement: sql, values: insertParams });
      }
    }

    // 4. Exécution en batch avec executeSet
    try {
      if (recoveriesToUpdate.length > 0) {
        await this.db.executeSet(recoveriesToUpdate);
      }
      if (recoveriesToInsert.length > 0) {
        await this.db.executeSet(recoveriesToInsert);
      }

      const totalAffected = recoveriesToInsert.length + recoveriesToUpdate.length;
      if (totalAffected > 0) {
        console.log(`Successfully saved ${totalAffected} recoveries.`);
      }

    } catch (error) {
      console.error('Failed to save recoveries in transaction.', error);
      throw error;
    }
  }

  async getRecoveries(commercialId: string): Promise<Recovery[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const sql = `SELECT * FROM recoveries WHERE commercialId = ?`;
    const ret = await this.db.query(sql, [commercialId]);
    return ret.values || [];
  }

  async addTransaction(transaction: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    const sql = `INSERT INTO transactions
               (id, clientId, referenceId, type, amount, details, date, isSync, isLocal)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
      // On prépare tous les paramètres de manière robuste en amont
      const params = [
        this.generateUuid(), // Génère un nouvel ID unique pour chaque transaction
        transaction.clientId ?? null,
        transaction.referenceId ?? null,
        transaction.type?.toLowerCase() ?? 'unknown', // Gère le cas où 'type' est null
        transaction.amount ?? 0,
        transaction.details ?? null,
        transaction.date ?? new Date().toISOString(),
        transaction.isSync ? 1 : 0,  // Logique booléenne standard et correcte
        transaction.isLocal ? 1 : 0   // Conversion booléen -> entier
      ];

      await this.db.run(sql, params);

    } catch (error) {
      console.error("Erreur lors de l'insertion de la transaction:", error);
      throw error; // On relance l'erreur pour que le service appelant puisse la gérer
    }
  }

  async getTransactions(commercialId: string): Promise<any[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const sql = `
      SELECT t.* FROM transactions t
      JOIN clients c ON t.clientId = c.id
      WHERE c.commercial = ?
    `;
    const ret = await this.db.query(sql, [commercialId]);
    return ret.values || [];
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Nouvelles méthodes pour l'US008

  /**
   * Récupérer les distributions actives d'un client
   */
  async getClientActiveDistributions(clientId: string): Promise<Distribution[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const sql = `
      SELECT * FROM distributions
      WHERE clientId = ? AND remainingAmount > 0
      ORDER BY createdAt DESC
    `;
    const ret = await this.db.query(sql, [clientId]);
    return ret.values || [];
  }

  /**
   * Récupérer une distribution par son ID
   */
  async getDistributionById(distributionId: string): Promise<Distribution | null> {
    if (!this.db) {
      console.error('Database not initialized.');
      return null;
    }
    const sql = `SELECT * FROM distributions WHERE id = ?`;
    const ret = await this.db.query(sql, [distributionId]);
    return ret.values && ret.values.length > 0 ? ret.values[0] : null;
  }

  /**
   * Sauvegarder un nouveau recouvrement
   */
  async saveRecovery(recovery: Recovery): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized.');
      return;
    }
    const sql = `
      INSERT INTO recoveries (
        id, amount, paymentDate, paymentMethod, notes,
        distributionId, clientId, commercialId,
        isLocal, isSync, syncDate, createdAt, isDefaultStake
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db.run(sql, [
      recovery.id,
      recovery.amount,
      recovery.paymentDate,
      recovery.paymentMethod,
      recovery.notes,
      recovery.distributionId,
      recovery.clientId,
      recovery.commercialId,
      recovery.isLocal ? 1 : 0,
      recovery.isSync ? 1 : 0,
      recovery.syncDate,
      recovery.createdAt,
      recovery.isDefaultStake ? 1 : 0
    ]);
  }

  /**
   * Récupérer les recouvrements non synchronisés
   */
  async getUnsyncedRecoveries(): Promise<Recovery[]> {
    if (!this.db) {
      console.error('Database not initialized.');
      return [];
    }
    const sql = `SELECT * FROM recoveries WHERE isSync = 0 AND isLocal = 1`;
    const ret = await this.db.query(sql);
    return ret.values || [];
  }

  /**
   * Marquer un recouvrement comme synchronisé
   */
  async markRecoveryAsSynced(recoveryId: string): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized.');
      return;
    }
    const sql = `
      UPDATE recoveries
      SET isSync = 1, syncDate = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [new Date().toISOString(), recoveryId]);
  }

  /**
   * Mettre à jour une distribution
   */
  async updateDistribution(distribution: Distribution): Promise<void> {
    if (!this.db) {
      console.error('Database not initialized.');
      return;
    }
    const sql = `
      UPDATE distributions
      SET remainingAmount = ?, paidAmount = ?
      WHERE id = ?
    `;
    await this.db.run(sql, [
      distribution.remainingAmount,
      distribution.paidAmount,
      distribution.id
    ]);
  }

  /**
   * Exporter la base de données vers un format SQL
   */
  async exportDatabase(): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    try {
      let sqlBackup = '-- Elykia Mobile Database Backup\n';
      sqlBackup += `-- Generated on: ${new Date().toISOString()}\n\n`;

      // Liste des tables à exporter
      const tables = [
        'users', 'commercials', 'articles', 'localities', 'clients',
        'accounts', 'stock_outputs', 'stock_output_items', 'distributions',
        'distribution_items', 'recoveries', 'sync_logs', 'daily_reports', 'transactions',
        'id_mappings', 'tontine_sessions', 'tontine_members', 'tontine_collections', 'tontine_deliveries', 'tontine_delivery_items', 'tontine_stocks'
      ];

      for (const tableName of tables) {
        try {
          // Récupérer les données de la table
          const result = await this.db.query(`SELECT * FROM ${tableName}`);
          const rows = result.values || [];

          if (rows.length > 0) {
            sqlBackup += `-- Table: ${tableName}\n`;
            sqlBackup += `DELETE FROM ${tableName};\n`;

            // Récupérer les noms des colonnes
            const columns = Object.keys(rows[0]);
            const columnNames = columns.join(', ');

            for (const row of rows) {
              const values = columns.map(col => {
                const value = row[col];
                if (value === null || value === undefined) {
                  return 'NULL';
                } else if (typeof value === 'boolean') { // Handle boolean values
                  return value ? '1' : '0';
                } else if (typeof value === 'string') {
                  return `'${value.replace(/'/g, "''")}'`; // Échapper les apostrophes
                } else {
                  return value.toString();
                }
              }).join(', ');

              sqlBackup += `INSERT INTO ${tableName} (${columnNames}) VALUES (${values});\n`;
            }
            sqlBackup += '\n';
          }
        } catch (error) {
          console.warn(`Error exporting table ${tableName}:`, error);
          sqlBackup += `-- Error exporting table ${tableName}: ${error}\n\n`;
        }
      }

      console.log('Database export completed');
      return sqlBackup;
    } catch (error) {
      console.error('Error during database export:', error);
      throw error;
    }
  }

  /**
   * Sauvegarder les données exportées dans un fichier
   */
  async saveBackupToFile(backupData: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `db-backup-${timestamp}.sql`;
      const folderPath = 'elykia';

      // Créer le dossier s'il n'existe pas
      try {
        await Filesystem.mkdir({
          path: folderPath,
          directory: Directory.Documents,
          recursive: true
        });
      } catch (error) {
        // Le dossier existe déjà, on continue
        console.log('Folder already exists or created');
      }

      // Sauvegarder le fichier
      await Filesystem.writeFile({
        path: `${folderPath}/${fileName}`,
        data: backupData,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      console.log(`Database backup saved to Documents/${folderPath}/${fileName}`);
    } catch (error) {
      console.error('Error saving backup file:', error);
      throw error;
    }
  }

  /**
   * Vérifier si les tables critiques sont vides
   */
  async areTablesEmpty(): Promise<boolean> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    try {
      // Vérifier les tables commercials et articles
      const commercialsResult = await this.db.query('SELECT COUNT(*) as count FROM commercials');
      const articlesResult = await this.db.query('SELECT COUNT(*) as count FROM articles');

      const commercialsCount = commercialsResult.values?.[0]?.count || 0;
      const articlesCount = articlesResult.values?.[0]?.count || 0;

      console.log(`Tables check - Commercials: ${commercialsCount}, Articles: ${articlesCount}`);

      return commercialsCount === 0 || articlesCount === 0;
    } catch (error) {
      console.error('Error checking tables:', error);
      return true; // Considérer comme vides en cas d'erreur
    }
  }

  /**
   * Trouver tous les fichiers de backup avec approche hybride (Filesystem + SAF via FilePicker)
   */
  async findAllBackupFiles(): Promise<{ path: string, size: number }[]> {
    console.log('🔍 Starting cross-installation file search with hybrid approach');

    // Stratégie 1: Scan agressif traditionnel (pour les fichiers accessibles)
    try {
      const aggressiveFiles = await this.scanAllBackupFilesAggressive();
      if (aggressiveFiles.length > 0) {
        console.log(`✅ Found ${aggressiveFiles.length} backup files via aggressive scan`);
        return aggressiveFiles;
      }
    } catch (error) {
      console.warn('❌ Aggressive scan failed:', error);
    }

    // Stratégie 2: Utiliser Storage Access Framework via FilePicker
    console.log('⚠️ No backup files found automatically. SAF/FilePicker available for manual access.');
    return [];
  }

  /**
   * Demander l'accès persistant au dossier via Storage Access Framework
   */
  async requestDirectoryAccessViaSAF(): Promise<{ path: string, size: number }[]> {
    try {
      console.log('📂 Requesting directory access via Storage Access Framework...');

      // Utiliser FilePicker pour permettre à l'utilisateur de sélectionner le dossier elykia
      const result = await FilePicker.pickFiles({
        types: ['application/sql', 'text/plain'],
        readData: false // On veut juste l'accès, pas lire immédiatement
      });

      if (!result.files || result.files.length === 0) {
        console.log('❌ No directory access granted');
        return [];
      }

      // Pour l'instant, on retourne les fichiers sélectionnés
      // Dans une implémentation complète, on sauvegarderait l'URI du dossier
      const backupFiles = result.files
        .filter(file => file.name?.startsWith('db-backup-') && file.name?.endsWith('.sql'))
        .map(file => ({
          path: file.path || file.name || '',
          size: file.size || 0
        }));

      console.log(`✅ SAF access granted: Found ${backupFiles.length} backup files`);
      return backupFiles;

    } catch (error) {
      console.error('❌ SAF directory access failed:', error);
      throw error;
    }
  }

  /**
   * Fallback: File Picker pour sélection manuelle
   */
  async selectBackupFileManually(): Promise<{ path: string, content: string } | null> {
    try {
      console.log('📂 Opening file picker for manual backup selection...');

      const result = await FilePicker.pickFiles({
        types: ['application/sql', 'text/plain'],
        readData: true
      });

      if (!result.files || result.files.length === 0) {
        console.log('❌ No file selected');
        return null;
      }

      const file = result.files[0];

      // Vérifier que c'est un fichier de backup valide
      if (!file.name?.startsWith('db-backup-') || !file.name?.endsWith('.sql')) {
        throw new Error('Le fichier sélectionné n\'est pas un fichier de backup valide');
      }

      console.log(`✅ File selected: ${file.name} (${file.size} bytes)`);

      return {
        path: file.path || file.name,
        content: file.data || ''
      };

    } catch (error) {
      console.error('❌ File picker failed:', error);
      throw error;
    }
  }

  /**
   * Scan agressif de tous les fichiers de backup, même ceux d'autres installations
   */
  private async scanAllBackupFilesAggressive(): Promise<{ path: string, size: number }[]> {
    const allFoundFiles: { path: string, size: number }[] = [];

    // Stratégies d'accès multiples pour contourner les restrictions d'UID
    const accessStrategies = [
      // Stratégie 1: Documents avec différents chemins
      { directory: Directory.Documents, paths: ['elykia', './elykia', '/elykia', 'Documents/elykia'] },
      // Stratégie 2: External Storage
      { directory: Directory.ExternalStorage, paths: ['elykia', 'Documents/elykia', 'Download/elykia'] },
      // Stratégie 3: Data directory (pour les fichiers privés)
      { directory: Directory.Data, paths: ['elykia', '../Documents/elykia', '../../storage/emulated/0/Documents/elykia'] }
    ];

    for (const strategy of accessStrategies) {
      for (const path of strategy.paths) {
        try {
          console.log(`🔄 Trying: ${strategy.directory} / ${path}`);

          const result = await Filesystem.readdir({
            path: path,
            directory: strategy.directory
          });

          console.log(`📁 Found ${result.files.length} files in ${path}`);

          // Filtrer et traiter les fichiers de backup
          const backupFiles = result.files
            .filter(file => file.name.startsWith('db-backup-') && file.name.endsWith('.sql'))
            .map(file => {
              const fullPath = `${path}/${file.name}`;
              return {
                path: fullPath,
                size: file.size || 0,
                directory: strategy.directory,
                fileName: file.name
              };
            });

          // Ajouter les fichiers trouvés (éviter les doublons)
          for (const file of backupFiles) {
            const exists = allFoundFiles.some(existing =>
              existing.path.endsWith(file.fileName) || existing.path === file.path
            );

            if (!exists) {
              console.log(`📄 Adding: ${file.fileName} (${file.size} bytes)`);
              allFoundFiles.push({
                path: file.path,
                size: file.size
              });
            } else {
              console.log(`⚠️ Duplicate skipped: ${file.fileName}`);
            }
          }

        } catch (error) {
          console.warn(`❌ Strategy failed: ${strategy.directory} / ${path}`, error);
        }
      }
    }

    // Trier par nom de fichier (timestamp) décroissant
    allFoundFiles.sort((a, b) => {
      const aName = a.path.split('/').pop() || '';
      const bName = b.path.split('/').pop() || '';
      return bName.localeCompare(aName);
    });

    console.log(`📊 Total unique files found: ${allFoundFiles.length}`);
    return allFoundFiles;
  }

  /**
   * Méthode alternative utilisant l'accès direct au système de fichiers
   */
  private async scanWithDirectFileSystemAccess(): Promise<{ path: string, size: number }[]> {
    const foundFiles: { path: string, size: number }[] = [];

    try {
      console.log('🔄 Attempting direct filesystem access...');

      // Essayer d'accéder directement au dossier Documents
      const documentsPath = '';
      const documentsResult = await Filesystem.readdir({
        path: documentsPath,
        directory: Directory.Documents
      });

      console.log('📁 Documents root contents:', documentsResult.files.map(f => f.name));

      // Chercher le dossier elykia
      const elykyaFolder = documentsResult.files.find(f => f.name === 'elykia');
      if (elykyaFolder) {
        console.log('✅ Found elykia folder');

        // Essayer plusieurs méthodes pour lire le contenu
        const readMethods = [
          () => Filesystem.readdir({ path: 'elykia', directory: Directory.Documents }),
          () => Filesystem.readdir({ path: './elykia', directory: Directory.Documents }),
          () => Filesystem.readdir({ path: '/elykia', directory: Directory.Documents })
        ];

        for (const method of readMethods) {
          try {
            const result = await method();
            console.log(`� Files in elykia:`, result.files.map(f => f.name));

            // Traiter tous les fichiers trouvés
            const backupFiles = result.files
              .filter(file => file.name.startsWith('db-backup-') && file.name.endsWith('.sql'))
              .map(file => ({
                path: `elykia/${file.name}`,
                size: file.size || 0
              }));

            // Ajouter les nouveaux fichiers
            for (const file of backupFiles) {
              const exists = foundFiles.some(existing => existing.path === file.path);
              if (!exists) {
                foundFiles.push(file);
                console.log(`✅ Added: ${file.path}`);
              }
            }

            if (backupFiles.length > 0) {
              break; // Si on a trouvé des fichiers, pas besoin d'essayer les autres méthodes
            }

          } catch (error) {
            console.warn('Method failed:', error);
          }
        }
      }

    } catch (error) {
      console.error('Direct filesystem access failed:', error);
    }

    return foundFiles;
  }

  /**
   * Diagnostiquer les problèmes d'accès aux fichiers de backup
   */
  async diagnoseBackupFileAccess(): Promise<void> {
    console.log('🔍 === DIAGNOSTIC BACKUP FILE ACCESS ===');

    try {
      // 1. Vérifier l'existence du dossier Documents
      console.log('📁 Checking Documents directory...');
      const documentsContent = await Filesystem.readdir({
        path: '',
        directory: Directory.Documents
      });
      console.log('Documents contents:', documentsContent.files.map(f => f.name));

      // 2. Vérifier l'existence du dossier elykia
      const elykyaExists = documentsContent.files.some(f => f.name === 'elykia');
      console.log(`📂 elykia folder exists: ${elykyaExists}`);

      if (elykyaExists) {
        // 3. Essayer de lire le contenu du dossier elykia
        try {
          const elykyaContent = await Filesystem.readdir({
            path: 'elykia',
            directory: Directory.Documents
          });
          console.log('📄 elykia folder contents:', elykyaContent.files.map(f => f.name));

          // 4. Identifier les fichiers de backup
          const backupFiles = elykyaContent.files.filter(f =>
            f.name.startsWith('db-backup-') && f.name.endsWith('.sql')
          );
          console.log(`💾 Backup files found: ${backupFiles.length}`);
          backupFiles.forEach(file => console.log(`  - ${file.name} (size: ${file.size || 'unknown'})`));

          // 5. Tester l'accès à chaque fichier
          for (const file of backupFiles) {
            try {
              const stats = await Filesystem.stat({
                path: `elykia/${file.name}`,
                directory: Directory.Documents
              });
              console.log(`✅ Can access ${file.name} - Size: ${stats.size}`);
            } catch (error) {
              console.log(`❌ Cannot access ${file.name} - Error:`, error);
            }
          }

        } catch (error) {
          console.log('❌ Cannot read elykia folder contents:', error);
        }
      }

      // 6. Tester les permissions
      console.log('🔐 Testing file creation permissions...');
      try {
        const testFileName = `test-${Date.now()}.txt`;
        await Filesystem.writeFile({
          path: `elykia/${testFileName}`,
          data: 'test',
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        console.log('✅ Can create files in elykia folder');

        // Nettoyer le fichier de test
        await Filesystem.deleteFile({
          path: `elykia/${testFileName}`,
          directory: Directory.Documents
        });
        console.log('✅ Can delete files in elykia folder');
      } catch (error) {
        console.log('❌ Cannot create/delete files in elykia folder:', error);
      }

    } catch (error) {
      console.error('❌ Diagnostic failed:', error);
    }

    console.log('🔍 === END DIAGNOSTIC ===');
  }
  /**
   * Méthode de test pour vérifier l'accès cross-installation aux fichiers avec MediaStore
   */
  async testCrossInstallationFileAccess(): Promise<void> {
    console.log('🧪 === TESTING CROSS-INSTALLATION FILE ACCESS WITH MEDIASTORE ===');

    // 1. Test MediaStore API
    console.log('📱 Testing MediaStore API...');
    try {
      // Méthode supprimée - utiliser SAF à la place
      console.log('? SAF available for manual access');
    } catch (error) {
      console.warn('❌ MediaStore test failed:', error);
    }

    // 2. Test de la méthode findAllBackupFiles améliorée
    console.log('🔍 Testing enhanced findAllBackupFiles...');
    const files = await this.findAllBackupFiles();
    console.log(`📊 Result: Found ${files.length} backup files`);
    files.forEach(file => console.log(`  - ${file.path} (${file.size} bytes)`));

    // 3. Diagnostic complet (fallback)
    console.log('🔍 Running diagnostic scan...');
    await this.diagnoseBackupFileAccess();

    // 4. Créer un fichier de test pour vérifier la persistance
    console.log('📝 Creating test backup file...');
    try {
      const testBackupData = `-- Test backup created at ${new Date().toISOString()}\nSELECT 'MediaStore test' as message;`;
      await this.saveBackupToFile(testBackupData);
      console.log('✅ Test backup file created successfully');

      // 5. Vérifier que le fichier est immédiatement accessible via MediaStore
      console.log('🔄 Re-testing MediaStore after file creation...');
      const filesAfterCreation = await this.findAllBackupFiles();
      console.log(`📊 After creation: Found ${filesAfterCreation.length} backup files`);

    } catch (error) {
      console.error('❌ Failed to create test backup:', error);
    }

    // 6. Test du File Picker (optionnel - nécessite interaction utilisateur)
    console.log('📂 File Picker is available for manual selection if needed');

    console.log('🧪 === END MEDIASTORE TEST ===');
  }

  async findLatestBackupFile(): Promise<string | null> {
    try {
      const folderPath = 'elykia';

      // Lister les fichiers dans le dossier
      const result = await Filesystem.readdir({
        path: folderPath,
        directory: Directory.Documents
      });

      // Filtrer les fichiers de backup et trouver le plus récent
      const backupFiles = result.files
        .filter(file => file.name.startsWith('db-backup-') && file.name.endsWith('.sql'))
        .sort((a, b) => b.name.localeCompare(a.name)); // Tri décroissant par nom (timestamp)

      if (backupFiles.length > 0) {
        const latestFile = `${folderPath}/${backupFiles[0].name}`;
        console.log(`Latest backup file found: ${latestFile}`);
        return latestFile;
      }

      return null;
    } catch (error) {
      console.error('Error finding backup files:', error);
      return null;
    }
  }



  async deleteClientAndRelatedData(clientId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    try {
      // On prépare un "set" de toutes les requêtes de suppression.
      // L'ordre est important : on supprime les "enfants" avant les "parents".
      const deleteSet: capSQLiteSet[] = [
        // Étape 1: Supprimer les items de distribution liés au client.
        // C'est plus efficace de le faire avec une sous-requête.
        {
          statement: `DELETE FROM distribution_items WHERE distributionId IN (SELECT id FROM distributions WHERE clientId = ?)`,
          values: [clientId]
        },
        // Étape 2: Supprimer les recouvrements du client
        {
          statement: `DELETE FROM recoveries WHERE clientId = ?`,
          values: [clientId]
        },
        // Étape 3: Supprimer les distributions du client
        {
          statement: `DELETE FROM distributions WHERE clientId = ?`,
          values: [clientId]
        },
        // Étape 4: Supprimer le compte du client
        {
          statement: `DELETE FROM accounts WHERE clientId = ?`,
          values: [clientId]
        },
        // Étape 5: Enfin, supprimer le client lui-même
        {
          statement: `DELETE FROM clients WHERE id = ?`,
          values: [clientId]
        }
      ];

      // On exécute l'ensemble des opérations.
      // executeSet est transactionnel : si une requête échoue, tout est annulé.
      await this.db.executeSet(deleteSet);

      this.log.log(`Successfully deleted client ${clientId} and all related data.`);

    } catch (error) {
      // Le rollback est géré automatiquement par executeSet.
      this.log.log(`Failed to delete client ${clientId} and related data.`);
      console.error('Failed to delete client and related data:', error);
      throw error; // On relance l'erreur pour que le code appelant soit notifié.
    }
  }

  async updateClientLocation(id: string, latitude: number, longitude: number): Promise<Client> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }
    const sql = `UPDATE clients SET updated=1, latitude=?, longitude=? WHERE id=?`;
    await this.db.run(sql, [latitude, longitude, id]);
    this.log.log(`Location for client with id ${id} updated.`);
    const updatedClient = await this.db.query('SELECT * FROM clients WHERE id = ?', [id]);
    if (updatedClient.values && updatedClient.values.length > 0) {
      return updatedClient.values[0];
    } else {
      throw new Error(`Client with id ${id} not found after update.`);
    }
  }

  async getUpdatedClients(): Promise<Client[]> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }
    const result = await this.db.query('SELECT * FROM clients WHERE updated = 1');
    return result.values || [];
  }

  async markClientAsLocationSynced(clientId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }
    const sql = `UPDATE clients SET updated = 0 WHERE id = ?`;
    await this.db.run(sql, [clientId]);
    this.log.log(`Client with id ${clientId} marked as location synced.`);
  }

  async getUpdatedPhotoClients(): Promise<Client[]> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }
    const result = await this.db.query('SELECT * FROM clients WHERE updatedPhoto = 1');
    return result.values || [];
  }

  async markClientAsPhotoSynced(clientId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }
    const sql = `UPDATE clients SET updatedPhoto = 0 WHERE id = ?`;
    await this.db.run(sql, [clientId]);
    this.log.log(`Client with id ${clientId} marked as photo synced.`);
  }

  async updateClientPhotosAndInfo(data: { clientId: string; cardType: string; cardID: string; profilPhoto: string | null; cardPhoto: string | null; profilPhotoUrl?: string | null; cardPhotoUrl?: string | null; }): Promise<Client> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    const sql = `UPDATE clients SET cardType = ?, cardID = ?, profilPhoto = ?, cardPhoto = ?, profilPhotoUrl = ?, cardPhotoUrl = ?, updatedPhoto = 1, updatedPhotoUrl = 1 WHERE id = ?`;

    // On s'assure que toutes les valeurs sont 'null' si elles sont 'undefined'
    const params = [
      data.cardType ?? null,
      data.cardID ?? null,
      data.profilPhoto ?? null,
      data.cardPhoto ?? null,
      data.profilPhotoUrl ?? data.profilPhoto ?? null, // Si profilPhotoUrl n'est pas fournie, utiliser profilPhoto
      data.cardPhotoUrl ?? data.cardPhoto ?? null,     // Si cardPhotoUrl n'est pas fournie, utiliser cardPhoto
      data.clientId
    ];

    await this.db.run(sql, params);

    this.log.log(`Photos and info for client with id ${data.clientId} updated.`);

    const updatedClient = await this.db.query('SELECT * FROM clients WHERE id = ?', [data.clientId]);
    if (updatedClient.values && updatedClient.values.length > 0) {
      return updatedClient.values[0];
    } else {
      throw new Error(`Client with id ${data.clientId} not found after update.`);
    }
  }

  async updateClient(client: Client): Promise<Client> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    // Generate new syncHash
    const keysToInclude = ['id', 'firstname', 'lastname', 'phone', 'address', 'dateOfBirth', 'occupation', 'clientType', 'cardType', 'cardID', 'quarter', 'commercial', 'latitude', 'longitude', 'mll', 'contactPersonName', 'contactPersonPhone', 'contactPersonAddress', 'code', 'creditInProgress', 'tontineCollector'];
    const newSyncHash = this.generateHash(client, keysToInclude);

    const sql = `UPDATE clients SET
      firstname = ?,
      lastname = ?,
      fullName = ?,
      phone = ?,
      address = ?,
      dateOfBirth = ?,
      occupation = ?,
      clientType = ?,
      cardType = ?,
      cardID = ?,
      quarter = ?,
      latitude = ?,
      longitude = ?,
      mll = ?,
      profilPhoto = ?,
      contactPersonName = ?,
      contactPersonPhone = ?,
      contactPersonAddress = ?,
      commercial = ?,
      creditInProgress = ?,
      isLocal = ?,
      isSync = ?,
      syncDate = ?,
      createdAt = ?,
      syncHash = ?,
      code = ?,
      cardPhoto = ?,
      tontineCollector = ?
      WHERE id = ?`;

    const fullName = `${client.firstname} ${client.lastname}`;

    await this.db.run(sql, [
      client.firstname,
      client.lastname,
      fullName,
      client.phone,
      client.address,
      client.dateOfBirth,
      client.occupation,
      client.clientType,
      client.cardType,
      client.cardID,
      client.quarter,
      client.latitude,
      client.longitude,
      client.mll,
      client.profilPhoto,
      client.contactPersonName,
      client.contactPersonPhone,
      client.contactPersonAddress,
      client.commercial,
      client.creditInProgress ? 1 : 0,
      client.isLocal ? 1 : 0,
      client.isSync ? 1 : 0,
      client.syncDate,
      client.createdAt,
      newSyncHash, // <-- Use the new hash
      client.code,
      client.cardPhoto,
      (client as any).tontineCollector ?? null,
      client.id
    ]);

    const updatedClient = await this.db.query('SELECT * FROM clients WHERE id = ?', [client.id]);
    if (updatedClient.values && updatedClient.values.length > 0) {
      return this.mapRowToClient(updatedClient.values[0]);
    } else {
      throw new Error(`Client with id ${client.id} not found after update.`);
    }
  }

  private mapRowToClient(row: any): Client {
    return {
      id: row.id,
      firstname: row.firstname,
      lastname: row.lastname,
      fullName: row.fullName,
      phone: row.phone,
      address: row.address,
      dateOfBirth: row.dateOfBirth,
      occupation: row.occupation,
      clientType: row.clientType,
      cardType: row.cardType,
      cardID: row.cardID,
      quarter: row.quarter,
      latitude: row.latitude,
      longitude: row.longitude,
      mll: row.mll,
      profilPhoto: row.profilPhoto,
      contactPersonName: row.contactPersonName,
      contactPersonPhone: row.contactPersonPhone,
      contactPersonAddress: row.contactPersonAddress,
      commercial: row.commercial,
      creditInProgress: row.creditInProgress === 1,
      isLocal: row.isLocal === 1,
      isSync: row.isSync === 1,
      syncDate: row.syncDate,
      createdAt: row.createdAt,
      syncHash: row.syncHash,
      code: row.code,
      cardPhoto: row.cardPhoto,
      updated: row.updated === 1,
      tontineCollector: row.tontineCollector
    } as Client;
  }

  // ==================== ORDER METHODS ====================

  /**
   * Save orders and their items in a single transaction (similar to saveDistributionsAndItems)
   */
  async saveOrdersAndItems(orders: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    if (!orders || orders.length === 0) {
      console.log('No orders to save.');
      return;
    }

    // === ÉTAPE 1: PRÉPARATION ===
    const keysToInclude = ['id', 'reference', 'totalAmount', 'status', 'clientId', 'commercialId'];
    const existingRows = await this.db.query('SELECT id, syncHash FROM orders');

    const existingOrderMap = new Map<string, string>(
      existingRows.values?.map((row: DbRowWithHash) => [String(row.id), row.syncHash]) ?? []
    );

    const ordersToUpdate: capSQLiteSet[] = [];
    const ordersToInsert: capSQLiteSet[] = [];
    const allItemsToInsert: capSQLiteSet[] = [];
    const orderIdsToClearItems: string[] = [];
    const now = new Date().toISOString();

    for (const order of orders) {
      const orderIdStr = String(order.id);
      if (!orderIdStr) { continue; }

      const newHash = this.generateHash(order, keysToInclude);
      const isExisting = existingOrderMap.has(orderIdStr);
      const needsUpdate = isExisting && existingOrderMap.get(orderIdStr) !== newHash;

      if (isExisting && !needsUpdate) {
        continue;
      }

      // Si une commande est mise à jour, on supprime TOUJOURS ses anciens items.
      if (needsUpdate) {
        orderIdsToClearItems.push(orderIdStr);
      }

      if (needsUpdate) {
        const sql = `UPDATE orders SET reference=?, totalAmount=?, advance=?, remainingAmount=?, dailyPayment=?, startDate=?, endDate=?, status=?, clientId=?, commercialId=?, isLocal=?, isSync=?, syncDate=?, createdAt=?, syncHash=?, articleCount=? WHERE id=?`;
        ordersToUpdate.push({
          statement: sql,
          values: [
            order.reference ?? null,
            order.totalAmount ?? 0,
            order.advance ?? 0,
            order.remainingAmount ?? order.totalAmount ?? 0,
            order.dailyPayment ?? 0,
            order.startDate ?? null,
            order.endDate ?? null,
            order.status ?? null,
            order.clientId ?? null,
            order.commercialId ?? null,
            order.isLocal ? 1 : 0,
            order.isSync ? 1 : 0,
            now,
            order.createdAt ?? now,
            newHash,
            order.articleCount ?? 0,
            orderIdStr
          ]
        });
      } else if (!isExisting) {
        const sql = `INSERT INTO orders (id, reference, totalAmount, advance, remainingAmount, dailyPayment, startDate, endDate, status, clientId, commercialId, isLocal, isSync, syncDate, createdAt, syncHash, articleCount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        ordersToInsert.push({
          statement: sql,
          values: [
            orderIdStr,
            order.reference ?? null,
            order.totalAmount ?? 0,
            order.advance ?? 0,
            order.remainingAmount ?? order.totalAmount ?? 0,
            order.dailyPayment ?? 0,
            order.startDate ?? null,
            order.endDate ?? null,
            order.status ?? null,
            order.clientId ?? null,
            order.commercialId ?? null,
            order.isLocal ? 1 : 0,
            order.isSync ? 1 : 0,
            now,
            order.createdAt ?? now,
            newHash,
            order.articleCount ?? 0
          ]
        });
      }

      if (order.items && order.items.length > 0) {
        const sql = `INSERT INTO order_items (id, orderId, articleId, quantity, unitPrice, totalPrice, articleName) VALUES (?,?,?,?,?,?,?)`;
        for (const item of order.items) {
          allItemsToInsert.push({
            statement: sql,
            values: [
              item.id ?? this.generateUuid(),
              orderIdStr,
              item.articleId ?? null,
              item.quantity ?? 0,
              item.unitPrice ?? 0,
              item.totalPrice ?? 0,
              item.articleName ?? null
            ]
          });
        }
      }
    }

    // === ÉTAPE 2: EXÉCUTION ===
    try {
      if (orderIdsToClearItems.length > 0) {
        const placeholders = orderIdsToClearItems.map(() => '?').join(',');
        const sql = `DELETE FROM order_items WHERE orderId IN (${placeholders})`;
        await this.db.run(sql, orderIdsToClearItems);
      }

      if (ordersToUpdate.length > 0) {
        await this.db.executeSet(ordersToUpdate);
      }

      if (ordersToInsert.length > 0) {
        await this.db.executeSet(ordersToInsert);
      }

      if (allItemsToInsert.length > 0) {
        await this.db.executeSet(allItemsToInsert);
      }

      console.log(`Successfully saved ${orders.length} orders and their items.`);

    } catch (error) {
      console.error('Failed to save orders and items in transaction.', error);
      throw error;
    }
  }

  /**
   * Get all orders from local database
   */
  async getOrders(commercialId: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    try {
      const query = `SELECT * FROM orders WHERE commercialId = ? ORDER BY createdAt DESC`;
      const result = await this.db.query(query, [commercialId]);
      return result.values || [];
    } catch (error) {
      console.error('Error getting orders:', error);
      throw error;
    }
  }

  /**
   * Save orders to local database
   */
  async saveOrders(orders: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    if (!orders || orders.length === 0) {
      console.log('No orders to save.');
      return;
    }

    try {
      await this.db.execute('BEGIN TRANSACTION;');

      for (const order of orders) {
        const query = `
          INSERT OR REPLACE INTO orders (
            id, reference, totalAmount, advance, remainingAmount, dailyPayment,
            startDate, endDate, status, clientId, commercialId, isLocal, isSync,
            syncDate, createdAt, syncHash, articleCount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          order.id,
          order.reference,
          order.totalAmount,
          order.advance || 0,
          order.remainingAmount || order.totalAmount,
          order.dailyPayment || 0,
          order.startDate,
          order.endDate || '',
          order.status,
          order.clientId,
          order.commercialId,
          order.isLocal ? 1 : 0,
          order.isSync ? 1 : 0,
          order.syncDate || '',
          order.createdAt,
          order.syncHash || '',
          order.articleCount || 0
        ];

        await this.db.run(query, values);
      }

      await this.db.execute('COMMIT;');
      console.log(`Successfully saved ${orders.length} orders.`);
    } catch (error) {
      await this.db.execute('ROLLBACK;');
      console.error('Error saving orders:', error);
      throw error;
    }
  }

  /**
   * Get order items for a specific order
   */
  async getItemsForOrder(orderId: string): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    try {
      const query = `SELECT * FROM order_items WHERE orderId = ?`;
      const result = await this.db.query(query, [orderId]);
      return result.values || [];
    } catch (error) {
      console.error('Error getting order items:', error);
      throw error;
    }
  }

  /**
   * Get all order items
   */
  async getOrderItems(): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    try {
      const query = `SELECT * FROM order_items`;
      const result = await this.db.query(query);
      return result.values || [];
    } catch (error) {
      console.error('Error getting all order items:', error);
      throw error;
    }
  }

  /**
   * Save order items to local database
   */
  async saveOrderItems(items: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    if (!items || items.length === 0) {
      console.log('No order items to save.');
      return;
    }

    try {
      await this.db.execute('BEGIN TRANSACTION;');

      // Clear existing items first
      await this.db.execute('DELETE FROM order_items');

      for (const item of items) {
        const query = `
          INSERT INTO order_items (
            id, orderId, articleId, quantity, unitPrice, totalPrice, articleName
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          item.id,
          item.orderId,
          item.articleId,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          item.articleName || null
        ];

        await this.db.run(query, values);
      }

      await this.db.execute('COMMIT;');
      console.log(`Successfully saved ${items.length} order items.`);
    } catch (error) {
      await this.db.execute('ROLLBACK;');
      console.error('Error saving order items:', error);
      throw error;
    }
  }
  /**
   * ==========================================
   * TONTINE METHODS
   * ==========================================
   */

  async saveTontineSession(session: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized.');

    const query = `
      INSERT OR REPLACE INTO tontine_sessions (
        id, year, startDate, endDate, status, memberCount, totalCollected, isSync, syncDate, syncHash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Generate hash for change detection if needed, or use provided hash
    const syncHash = session.syncHash || this.generateHash(session, ['id', 'status', 'totalCollected', 'startDate', 'endDate']);

    await this.db.run(query, [
      session.id, session.year, session.startDate, session.endDate, session.status,
      session.memberCount, session.totalCollected, 1, new Date().toISOString(), syncHash
    ]);
  }

  async getTontineSession(): Promise<any> {
    if (!this.db) throw new Error('Database not initialized.');
    // Return the latest session regardless of status
    const result = await this.db.query('SELECT * FROM tontine_sessions ORDER BY year DESC, id DESC LIMIT 1');
    return result.values?.[0] || null;
  }

  async saveTontineMembers(members: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized.');
    if (!members.length) return;

    const query = `
      INSERT OR REPLACE INTO tontine_members (
        id, tontineSessionId, clientId, commercialUsername, totalContribution, deliveryStatus, registrationDate, frequency, amount, notes, isLocal, isSync, syncDate, syncHash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const set: capSQLiteSet[] = members.map(m => ({
      statement: query,
      values: [
        m.id, m.tontineSessionId, m.clientId, m.commercialUsername, m.totalContribution, m.deliveryStatus,
        m.registrationDate, m.frequency, m.amount, m.notes, m.isLocal ? 1 : 0, m.isSync ? 1 : 0, m.syncDate || new Date().toISOString(), m.syncHash
      ]
    }));

    await this.db.executeSet(set);
  }

  async getTontineMembers(sessionId: string, commercialUsername: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized.');
    const query = `
      SELECT tm.*, c.fullName as clientName, c.phone as clientPhone
      FROM tontine_members tm
      LEFT JOIN clients c ON tm.clientId = c.id
      WHERE tm.tontineSessionId = ? AND tm.commercialUsername = ?
    `;
    const result = await this.db.query(query, [sessionId, commercialUsername]);
    return result.values || [];
  }

  async getTontineCollectionsByCommercial(commercialUsername: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized.');

    console.log('DatabaseService.getTontineCollectionsByCommercial: commercialUsername =', commercialUsername);

    // DIAGNOSTIC: Check total collections count
    const countQuery = 'SELECT COUNT(*) as total FROM tontine_collections';
    const countResult = await this.db.query(countQuery, []);
    console.log('DIAGNOSTIC: Total tontine_collections in DB:', countResult.values?.[0]?.total || 0);

    // DIAGNOSTIC: Check total members count
    const membersCountQuery = 'SELECT COUNT(*) as total FROM tontine_members';
    const membersCountResult = await this.db.query(membersCountQuery, []);
    console.log('DIAGNOSTIC: Total tontine_members in DB:', membersCountResult.values?.[0]?.total || 0);

    // DIAGNOSTIC: Check members for this commercial
    const commercialMembersQuery = 'SELECT COUNT(*) as total FROM tontine_members WHERE commercialUsername = ?';
    const commercialMembersResult = await this.db.query(commercialMembersQuery, [commercialUsername]);
    console.log('DIAGNOSTIC: tontine_members for', commercialUsername, ':', commercialMembersResult.values?.[0]?.total || 0);

    // DIAGNOSTIC: Sample some collections
    const sampleQuery = 'SELECT * FROM tontine_collections LIMIT 5';
    const sampleResult = await this.db.query(sampleQuery, []);
    console.log('DIAGNOSTIC: Sample collections (first 5):', sampleResult.values);

    // DIAGNOSTIC: Sample some members
    const sampleMembersQuery = 'SELECT id, commercialUsername FROM tontine_members LIMIT 5';
    const sampleMembersResult = await this.db.query(sampleMembersQuery, []);
    console.log('DIAGNOSTIC: Sample members (first 5):', sampleMembersResult.values);

    // Utilise JOIN pour supporter les données existantes (sans commercialUsername) et nouvelles
    const query = `
      SELECT tc.*
      FROM tontine_collections tc
      INNER JOIN tontine_members tm ON tc.tontineMemberId = tm.id
      WHERE tm.commercialUsername = ? OR tc.commercialUsername = ?
    `;

    console.log('DatabaseService.getTontineCollectionsByCommercial: Executing query:', query);
    console.log('DatabaseService.getTontineCollectionsByCommercial: Parameters:', [commercialUsername, commercialUsername]);

    const result = await this.db.query(query, [commercialUsername, commercialUsername]);

    console.log('DatabaseService.getTontineCollectionsByCommercial: Query result:', result);
    console.log('DatabaseService.getTontineCollectionsByCommercial: Rows count:', result.values?.length || 0);
    console.log('DatabaseService.getTontineCollectionsByCommercial: Data:', result.values);

    return result.values || [];
  }

  async saveTontineCollections(collections: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized.');
    if (!collections.length) return;

    const query = `
      INSERT OR REPLACE INTO tontine_collections(
        id, tontineMemberId, amount, collectionDate, commercialUsername, isLocal, isSync, syncDate, syncHash
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const set: capSQLiteSet[] = collections.map(c => ({
      statement: query,
      values: [
        c.id, c.tontineMemberId, c.amount, c.collectionDate, c.commercialUsername,
        c.isLocal ? 1 : 0, c.isSync ? 1 : 0, c.syncDate || new Date().toISOString(), c.syncHash
      ]
    }));

    await this.db.executeSet(set);
  }

  async getTontineCollections(memberId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized.');
    const result = await this.db.query('SELECT * FROM tontine_collections WHERE tontineMemberId = ?', [memberId]);
    return result.values || [];
  }



  async saveTontineDeliveries(deliveries: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized.');
    if (!deliveries.length) return;

    const queryDelivery = `
      INSERT OR REPLACE INTO tontine_deliveries(
          id, tontineMemberId, commercialUsername, requestDate, deliveryDate, totalAmount, status, isLocal, isSync, syncDate, syncHash
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

    const queryItems = `
      INSERT OR REPLACE INTO tontine_delivery_items(
            id, tontineDeliveryId, articleId, quantity, unitPrice, totalPrice
          ) VALUES(?, ?, ?, ?, ?, ?)
            `;

    const set: capSQLiteSet[] = [];

    for (const d of deliveries) {
      set.push({
        statement: queryDelivery,
        values: [
          d.id, d.tontineMemberId, d.commercialUsername, d.requestDate, d.deliveryDate, d.totalAmount, d.status,
          d.isLocal ? 1 : 0, d.isSync ? 1 : 0, d.syncDate || new Date().toISOString(), d.syncHash
        ]
      });

      if (d.items && d.items.length) {
        for (const item of d.items) {
          set.push({
            statement: queryItems,
            values: [
              item.id, d.id, item.articleId, item.quantity, item.unitPrice, item.totalPrice
            ]
          });
        }
      }
    }

    await this.db.executeSet(set);
  }

  async getTontineDeliveries(memberId: string, commercialUsername: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized.');

    // Get deliveries
    const deliveriesResult = await this.db.query('SELECT * FROM tontine_deliveries WHERE tontineMemberId = ? AND commercialUsername = ?', [memberId, commercialUsername]);
    const deliveries = deliveriesResult.values || [];

    // Get items for each delivery
    for (const d of deliveries) {
      const itemsResult = await this.db.query('SELECT * FROM tontine_delivery_items WHERE tontineDeliveryId = ?', [d.id]);
      d.items = itemsResult.values || [];
    }

    return deliveries;
  }

  async saveTontineStocks(stocks: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized.');
    if (!stocks.length) return;

    const query = `
      INSERT OR REPLACE INTO tontine_stocks(
        id, commercial, creditId, articleId, articleName, unitPrice,
        totalQuantity, availableQuantity, distributedQuantity, year, tontineSessionId
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const set: capSQLiteSet[] = stocks.map(s => ({
      statement: query,
      values: [
        s.id, s.commercial, s.creditId || null, s.articleId, s.articleName || null, s.unitPrice,
        s.totalQuantity, s.availableQuantity, s.distributedQuantity, s.year, s.tontineSessionId
      ]
    }));

    await this.db.executeSet(set);
  }

  async getTontineStocks(commercial: string, sessionId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized.');
    const result = await this.db.query('SELECT * FROM tontine_stocks WHERE commercial = ? AND tontineSessionId = ?', [commercial, sessionId]);
    return result.values || [];
  }

  // ==========================================
  // IMPROVED BACKUP RESTORATION SYSTEM
  // ==========================================

  // ==========================================
  // IMPROVED BACKUP RESTORATION SYSTEM
  // ==========================================

  /**
   * Core restoration logic using transactions and validation
   * Acts as the single source of truth for all restore operations
   */
  async restoreFromSql(sqlContent: string): Promise<RestoreResult> {
    if (!this.db) {
      throw new Error('Database not initialized.');
    }

    const startTime = Date.now();
    const monitor = new RestoreMonitor();
    // Use the injected validator
    const transactionManager = new TransactionManager(this.db);
    const integrityValidator = new DataIntegrityValidator(this.db);

    try {
      console.log(`🔄 Starting SQL restoration...`);

      if (!sqlContent || sqlContent.trim().length === 0) {
        throw new RestoreException('CRITICAL', '', 'SQL content is empty');
      }

      // Phase 1: Parse and validate SQL statements
      const validation = this.restoreValidator.validateBackupFile(sqlContent);
      if (!validation.isValid) {
        throw new RestoreException('CRITICAL', '', `Invalid backup format: ${validation.errors.join(', ')}`);
      }

      const statements = this.restoreValidator.parseSqlStatements(sqlContent);
      const expectedCounts = this.calculateExpectedCounts(statements);

      monitor.startMonitoring(statements.length);
      console.log(`📊 Parsed ${statements.length} SQL statements`);

      // Phase 2: Execute in transaction with monitoring
      await transactionManager.beginTransaction();

      // Temporarily disable foreign keys for restoration if needed, though usually better to respect them
      // await this.db.run('PRAGMA foreign_keys = OFF;'); 

      try {
        await this.executeStatementsWithProgress(statements, monitor);

        // Phase 3: Validate integrity before commit
        const integrityCheck = await integrityValidator.validateIntegrity(expectedCounts);

        if (integrityCheck.isValid) {
          await transactionManager.commitTransaction();
          console.log('✅ Transaction committed successfully');
        } else {
          console.warn('⚠️ Integrity check failed:', integrityCheck.summary);
          // Decided policy: Commit anyway if only counts mismatch? Or strictly rollback?
          // Given the requirement "gerer bien des erreur", safety is key.
          await transactionManager.rollbackTransaction();
          throw new RestoreException('CRITICAL', '', 'Integrity check failed: ' + integrityCheck.summary);
        }

        const duration = Date.now() - startTime;
        const result = monitor.generateReport();
        result.duration = duration;
        result.integrityCheck = integrityCheck;

        console.log(`🎉 Restoration completed in ${duration}ms: ${result.successfulStatements}/${result.totalStatements} successful`);

        return result;

      } catch (innerError: any) {
        // Capture inner execution errors
        if (innerError instanceof RestoreException) throw innerError;
        throw new RestoreException('CRITICAL', '', innerError.message || 'Error executing statements');
      }

    } catch (error: any) {
      await transactionManager.rollbackTransaction();
      console.error('❌ Restoration failed:', error);

      const duration = Date.now() - startTime;
      const restoreError = error instanceof RestoreException
        ? error
        : new RestoreException('CRITICAL', '', error.message || 'Unexpected error');

      return {
        success: false,
        totalStatements: monitor ? monitor.generateReport().totalStatements : 0,
        successfulStatements: monitor ? monitor.generateReport().successfulStatements : 0,
        failedStatements: monitor ? monitor.generateReport().failedStatements + 1 : 1,
        errors: [restoreError],
        duration: duration,
        tablesRestored: [],
        integrityCheck: { isValid: false, results: [], summary: 'Restoration failed' }
      };
    } finally {
      // await this.db.run('PRAGMA foreign_keys = ON;');
    }
  }

  /**
   * Helper to execute parsed statements
   */
  private async executeStatementsWithProgress(statements: SqlStatement[], monitor: RestoreMonitor): Promise<void> {
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        await this.db!.run(statement.content);
        monitor.updateProgress(i + 1, errorCount, statement.table);

        if (i > 0 && i % 100 === 0) {
          console.log(`📈 Progress: ${i + 1}/${statements.length} statements processed`);
        }

      } catch (error: any) {
        const severity = this.classifyError(error);
        const restoreError: RestoreError = {
          type: severity,
          statement: statement.content,
          error: error.message || 'Unknown DB error',
          table: statement.table,
          lineNumber: statement.lineNumber
        };

        monitor.recordError(restoreError);

        if (severity === 'CRITICAL') {
          throw new RestoreException(severity, statement.content, error.message, statement.table, statement.lineNumber);
        }

        errorCount++;
        console.warn(`⚠️ Non-critical error in statement ${i + 1} (${statement.table}):`, error.message);
      }
    }
  }

  /**
   * Restore from a file path (legacy/auto-found)
   */
  async restoreFromBackup(backupFilePath: string): Promise<RestoreResult> {
    try {
      console.log(`📂 Reading backup file from: ${backupFilePath}`);
      const result = await Filesystem.readFile({
        path: backupFilePath,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      const sqlContent = result.data as string;
      return this.restoreFromSql(sqlContent);
    } catch (error: any) {
      console.error('Failed to read backup file for restore:', error);
      throw new Error(`Failed to read backup file: ${error.message}`);
    }
  }

  /**
   * Restore from manually selected file via SAF
   */
  async restoreFromManualSelection(): Promise<RestoreResult> {
    try {
      const selectedFile = await this.selectBackupFileManually();

      if (!selectedFile) {
        throw new Error('No backup file selected');
      }

      console.log(`📂 Processing manual selection: ${selectedFile.path}`);
      return this.restoreFromSql(selectedFile.content);

    } catch (error: any) {
      console.error('❌ Error in manual restoration flow:', error);
      throw error;
    }
  }

  private classifyError(error: any): 'CRITICAL' | 'WARNING' | 'INFO' {
    const errorMessage = (error.message || '').toLowerCase();

    // Define error patterns
    if (errorMessage.includes('syntax error') || errorMessage.includes('no such table')) {
      return 'CRITICAL';
    }

    if (errorMessage.includes('unique constraint failed')) {
      // Often acceptable in restoration if we are overwriting/merging
      return 'WARNING';
    }

    if (errorMessage.includes('foreign key constraint failed')) {
      return 'CRITICAL';
    }

    if (errorMessage.includes('database is locked')) {
      return 'CRITICAL';
    }

    return 'WARNING';
  }

  private calculateExpectedCounts(statements: SqlStatement[]): TableCounts {
    const counts: TableCounts = {};
    for (const statement of statements) {
      if (statement.type === 'INSERT') {
        const table = statement.table || 'unknown';
        counts[table] = (counts[table] || 0) + 1;
      }
    }
    return counts;
  }
}
