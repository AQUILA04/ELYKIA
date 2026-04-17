import { TestBed } from '@angular/core/testing';
import { RollbackManagerService } from './rollback-manager.service';
import { DatabaseService } from '../database.service';
import { RestorePoint, DataSnapshot } from '../../models/tontine-sync.models';

describe('RollbackManagerService', () => {
  let service: RollbackManagerService;
  let mockDatabaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    // Créer un mock du DatabaseService
    mockDatabaseService = jasmine.createSpyObj('DatabaseService', [
      'execute',
      'query',
      'getTontineSession',
      'saveTontineMembers',
      'saveTontineCollections',
      'saveTontineStocks'
    ]);

    TestBed.configureTestingModule({
      providers: [
        RollbackManagerService,
        { provide: DatabaseService, useValue: mockDatabaseService }
      ]
    });

    service = TestBed.inject(RollbackManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createRestorePoint', () => {
    it('should create a restore point with snapshot of current data', async () => {
      // Arrange
      const mockSession = { id: 'session-123' };
      const mockMembers = [
        { id: 'member-1', tontineSessionId: 'session-123', clientId: 'client-1' }
      ];
      const mockCollections = [
        { id: 'collection-1', tontineMemberId: 'member-1', amount: 1000 }
      ];
      const mockStocks = [
        { id: 'stock-1', tontineSessionId: 'session-123', articleId: 'article-1' }
      ];

      mockDatabaseService.execute.and.returnValue(Promise.resolve());
      mockDatabaseService.getTontineSession.and.returnValue(Promise.resolve(mockSession));
      mockDatabaseService.query.and.returnValues(
        Promise.resolve({ values: mockMembers }),
        Promise.resolve({ values: mockCollections }),
        Promise.resolve({ values: mockStocks }),
        Promise.resolve({ values: [] }) // Pour getAllRestorePoints
      );

      // Act
      const restorePoint = await service.createRestorePoint();

      // Assert
      expect(restorePoint).toBeDefined();
      expect(restorePoint.id).toBeDefined();
      expect(restorePoint.timestamp).toBeInstanceOf(Date);
      expect(restorePoint.dataSnapshot).toBeDefined();
      expect(restorePoint.dataSnapshot.members).toEqual(mockMembers);
      expect(restorePoint.dataSnapshot.collections).toEqual(mockCollections);
      expect(restorePoint.dataSnapshot.stocks).toEqual(mockStocks);
      expect(restorePoint.metadata).toBeDefined();
      expect(restorePoint.metadata.totalItemsSynced).toBe(3);
    });

    it('should create empty snapshot when no session exists', async () => {
      // Arrange
      mockDatabaseService.execute.and.returnValue(Promise.resolve());
      mockDatabaseService.getTontineSession.and.returnValue(Promise.resolve(null));

      // Act
      const restorePoint = await service.createRestorePoint();

      // Assert
      expect(restorePoint).toBeDefined();
      expect(restorePoint.dataSnapshot.members).toEqual([]);
      expect(restorePoint.dataSnapshot.collections).toEqual([]);
      expect(restorePoint.dataSnapshot.stocks).toEqual([]);
    });

    it('should throw error when database operation fails', async () => {
      // Arrange
      mockDatabaseService.execute.and.returnValue(Promise.reject(new Error('Database error')));

      // Act & Assert
      await expectAsync(service.createRestorePoint()).toBeRejectedWithError(/Échec de la création du point de restauration/);
    });
  });

  describe('rollbackToRestorePoint', () => {
    it('should restore data from snapshot', async () => {
      // Arrange
      const mockSession = { id: 'session-123' };
      const mockSnapshot: DataSnapshot = {
        members: [{ id: 'member-1', tontineSessionId: 'session-123' }],
        collections: [{ id: 'collection-1', tontineMemberId: 'member-1' }],
        stocks: [{ id: 'stock-1', tontineSessionId: 'session-123' }],
        timestamp: new Date()
      };
      const mockRestorePoint: RestorePoint = {
        id: 'restore-1',
        timestamp: new Date(),
        dataSnapshot: mockSnapshot,
        metadata: {
          lastSyncDate: new Date(),
          lastSuccessfulSync: new Date(),
          syncVersion: '1.0.0',
          dataChecksum: 'checksum',
          totalItemsSynced: 3,
          syncDuration: 0
        }
      };

      mockDatabaseService.getTontineSession.and.returnValue(Promise.resolve(mockSession));
      mockDatabaseService.execute.and.returnValue(Promise.resolve());
      mockDatabaseService.saveTontineMembers.and.returnValue(Promise.resolve());
      mockDatabaseService.saveTontineCollections.and.returnValue(Promise.resolve());
      mockDatabaseService.saveTontineStocks.and.returnValue(Promise.resolve());

      // Act
      await service.rollbackToRestorePoint(mockRestorePoint);

      // Assert
      expect(mockDatabaseService.execute).toHaveBeenCalledTimes(5); // 5 DELETE operations
      expect(mockDatabaseService.saveTontineMembers).toHaveBeenCalledWith(mockSnapshot.members);
      expect(mockDatabaseService.saveTontineCollections).toHaveBeenCalledWith(mockSnapshot.collections);
      expect(mockDatabaseService.saveTontineStocks).toHaveBeenCalledWith(mockSnapshot.stocks);
    });

    it('should throw error when restore point is invalid', async () => {
      // Act & Assert
      await expectAsync(service.rollbackToRestorePoint(null as any)).toBeRejectedWithError('Point de restauration invalide');
    });

    it('should throw error when no session exists', async () => {
      // Arrange
      const mockRestorePoint: RestorePoint = {
        id: 'restore-1',
        timestamp: new Date(),
        dataSnapshot: {
          members: [],
          collections: [],
          stocks: [],
          timestamp: new Date()
        },
        metadata: {
          lastSyncDate: new Date(),
          lastSuccessfulSync: new Date(),
          syncVersion: '1.0.0',
          dataChecksum: 'checksum',
          totalItemsSynced: 0,
          syncDuration: 0
        }
      };

      mockDatabaseService.getTontineSession.and.returnValue(Promise.resolve(null));

      // Act & Assert
      await expectAsync(service.rollbackToRestorePoint(mockRestorePoint)).toBeRejectedWithError(/Aucune session tontine trouvée/);
    });

    it('should not call save methods when snapshot is empty', async () => {
      // Arrange
      const mockSession = { id: 'session-123' };
      const mockRestorePoint: RestorePoint = {
        id: 'restore-1',
        timestamp: new Date(),
        dataSnapshot: {
          members: [],
          collections: [],
          stocks: [],
          timestamp: new Date()
        },
        metadata: {
          lastSyncDate: new Date(),
          lastSuccessfulSync: new Date(),
          syncVersion: '1.0.0',
          dataChecksum: 'checksum',
          totalItemsSynced: 0,
          syncDuration: 0
        }
      };

      mockDatabaseService.getTontineSession.and.returnValue(Promise.resolve(mockSession));
      mockDatabaseService.execute.and.returnValue(Promise.resolve());

      // Act
      await service.rollbackToRestorePoint(mockRestorePoint);

      // Assert
      expect(mockDatabaseService.saveTontineMembers).not.toHaveBeenCalled();
      expect(mockDatabaseService.saveTontineCollections).not.toHaveBeenCalled();
      expect(mockDatabaseService.saveTontineStocks).not.toHaveBeenCalled();
    });
  });

  describe('cleanupRestorePoints', () => {
    it('should delete old restore points when exceeding maximum', async () => {
      // Arrange
      const mockRestorePoints = Array.from({ length: 7 }, (_, i) => ({
        id: `restore-${i}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        dataSnapshot: JSON.stringify({ members: [], collections: [], stocks: [], timestamp: new Date() }),
        metadata: JSON.stringify({ totalItemsSynced: 0 })
      }));

      mockDatabaseService.execute.and.returnValue(Promise.resolve());
      mockDatabaseService.query.and.returnValue(Promise.resolve({ values: mockRestorePoints }));

      // Act
      await service.cleanupRestorePoints();

      // Assert
      // Should delete 2 oldest points (7 - 5 = 2)
      expect(mockDatabaseService.execute).toHaveBeenCalledTimes(3); // 1 CREATE TABLE + 2 DELETE
    });

    it('should not delete anything when under maximum', async () => {
      // Arrange
      const mockRestorePoints = Array.from({ length: 3 }, (_, i) => ({
        id: `restore-${i}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        dataSnapshot: JSON.stringify({ members: [], collections: [], stocks: [], timestamp: new Date() }),
        metadata: JSON.stringify({ totalItemsSynced: 0 })
      }));

      mockDatabaseService.execute.and.returnValue(Promise.resolve());
      mockDatabaseService.query.and.returnValue(Promise.resolve({ values: mockRestorePoints }));

      // Act
      await service.cleanupRestorePoints();

      // Assert
      // Should only call CREATE TABLE, no DELETE
      expect(mockDatabaseService.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle empty restore points list', async () => {
      // Arrange
      mockDatabaseService.execute.and.returnValue(Promise.resolve());
      mockDatabaseService.query.and.returnValue(Promise.resolve({ values: [] }));

      // Act
      await service.cleanupRestorePoints();

      // Assert
      expect(mockDatabaseService.execute).toHaveBeenCalledTimes(1); // Only CREATE TABLE
    });

    it('should throw error when database operation fails', async () => {
      // Arrange
      mockDatabaseService.execute.and.returnValue(Promise.reject(new Error('Database error')));

      // Act & Assert
      await expectAsync(service.cleanupRestorePoints()).toBeRejectedWithError(/Échec du nettoyage des points de restauration/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle database returning undefined values', async () => {
      // Arrange
      const mockSession = { id: 'session-123' };
      mockDatabaseService.execute.and.returnValue(Promise.resolve());
      mockDatabaseService.getTontineSession.and.returnValue(Promise.resolve(mockSession));
      mockDatabaseService.query.and.returnValue(Promise.resolve({ values: undefined }));

      // Act
      const restorePoint = await service.createRestorePoint();

      // Assert
      expect(restorePoint.dataSnapshot.members).toEqual([]);
      expect(restorePoint.dataSnapshot.collections).toEqual([]);
      expect(restorePoint.dataSnapshot.stocks).toEqual([]);
    });

    it('should generate unique restore point IDs', async () => {
      // Arrange
      const mockSession = { id: 'session-123' };
      mockDatabaseService.execute.and.returnValue(Promise.resolve());
      mockDatabaseService.getTontineSession.and.returnValue(Promise.resolve(mockSession));
      mockDatabaseService.query.and.returnValue(Promise.resolve({ values: [] }));

      // Act
      const restorePoint1 = await service.createRestorePoint();
      const restorePoint2 = await service.createRestorePoint();

      // Assert
      expect(restorePoint1.id).not.toEqual(restorePoint2.id);
    });
  });
});
