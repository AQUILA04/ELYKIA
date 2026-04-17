import { TestBed } from '@angular/core/testing';
import { DataCleanerService } from './data-cleaner.service';
import { DatabaseService } from '../database.service';
import { CleanupResult } from '../../models/tontine-sync.models';

describe('DataCleanerService', () => {
  let service: DataCleanerService;
  let databaseServiceSpy: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    // Créer un spy pour DatabaseService
    const dbSpy = jasmine.createSpyObj('DatabaseService', [
      'getTontineSession',
      'execute',
      'query'
    ]);

    TestBed.configureTestingModule({
      providers: [
        DataCleanerService,
        { provide: DatabaseService, useValue: dbSpy }
      ]
    });

    service = TestBed.inject(DataCleanerService);
    databaseServiceSpy = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('cleanTontineData', () => {
    it('should clean all tontine data and return cleanup result', async () => {
      // Arrange
      const commercialUsername = 'testuser';
      const sessionId = 'session-123';
      
      databaseServiceSpy.getTontineSession.and.returnValue(Promise.resolve({ id: sessionId }));
      databaseServiceSpy.query.and.returnValues(
        Promise.resolve({ values: [{ count: 5 }] }), // members count
        Promise.resolve({ values: [{ count: 10 }] }), // collections count
        Promise.resolve({ values: [{ count: 3 }] }) // stocks count
      );
      databaseServiceSpy.execute.and.returnValue(Promise.resolve());

      // Act
      const result: CleanupResult = await service.cleanTontineData(commercialUsername);

      // Assert
      expect(result.success).toBe(true);
      expect(result.membersDeleted).toBe(5);
      expect(result.collectionsDeleted).toBe(10);
      expect(result.stocksDeleted).toBe(3);
      expect(databaseServiceSpy.getTontineSession).toHaveBeenCalled();
    });

    it('should throw error when commercialUsername is empty', async () => {
      // Act & Assert
      await expectAsync(service.cleanTontineData('')).toBeRejectedWithError(
        'commercialUsername est requis pour le nettoyage des données'
      );
    });

    it('should throw error when no tontine session found', async () => {
      // Arrange
      databaseServiceSpy.getTontineSession.and.returnValue(Promise.resolve(null));

      // Act & Assert
      await expectAsync(service.cleanTontineData('testuser')).toBeRejectedWithError(
        'Aucune session tontine trouvée pour le nettoyage'
      );
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const commercialUsername = 'testuser';
      databaseServiceSpy.getTontineSession.and.returnValue(
        Promise.reject(new Error('Database connection failed'))
      );

      // Act & Assert
      await expectAsync(service.cleanTontineData(commercialUsername)).toBeRejectedWithError(
        /Échec du nettoyage des données tontine/
      );
    });
  });

  describe('cleanMembers', () => {
    it('should delete members for given session and commercial', async () => {
      // Arrange
      const sessionId = 'session-123';
      const commercialUsername = 'testuser';
      databaseServiceSpy.execute.and.returnValue(Promise.resolve());

      // Act
      await service.cleanMembers(sessionId, commercialUsername);

      // Assert
      expect(databaseServiceSpy.execute).toHaveBeenCalledTimes(3); // amount history, deliveries, members
    });

    it('should throw error when sessionId is empty', async () => {
      // Act & Assert
      await expectAsync(service.cleanMembers('', 'testuser')).toBeRejectedWithError(
        'sessionId est requis pour le nettoyage des membres'
      );
    });

    it('should throw error when commercialUsername is empty', async () => {
      // Act & Assert
      await expectAsync(service.cleanMembers('session-123', '')).toBeRejectedWithError(
        'commercialUsername est requis pour le nettoyage des membres'
      );
    });

    it('should handle database errors during member cleanup', async () => {
      // Arrange
      databaseServiceSpy.execute.and.returnValue(
        Promise.reject(new Error('Delete failed'))
      );

      // Act & Assert
      await expectAsync(service.cleanMembers('session-123', 'testuser')).toBeRejectedWithError(
        /Échec du nettoyage des membres/
      );
    });
  });

  describe('cleanCollections', () => {
    it('should delete collections for given commercial', async () => {
      // Arrange
      const commercialUsername = 'testuser';
      databaseServiceSpy.execute.and.returnValue(Promise.resolve());

      // Act
      await service.cleanCollections(commercialUsername);

      // Assert
      expect(databaseServiceSpy.execute).toHaveBeenCalledWith(
        jasmine.stringContaining('DELETE FROM tontine_collections'),
        [commercialUsername]
      );
    });

    it('should throw error when commercialUsername is empty', async () => {
      // Act & Assert
      await expectAsync(service.cleanCollections('')).toBeRejectedWithError(
        'commercialUsername est requis pour le nettoyage des collections'
      );
    });

    it('should handle database errors during collection cleanup', async () => {
      // Arrange
      databaseServiceSpy.execute.and.returnValue(
        Promise.reject(new Error('Delete failed'))
      );

      // Act & Assert
      await expectAsync(service.cleanCollections('testuser')).toBeRejectedWithError(
        /Échec du nettoyage des collections/
      );
    });
  });

  describe('cleanStocks', () => {
    it('should delete stocks for given commercial', async () => {
      // Arrange
      const commercialUsername = 'testuser';
      databaseServiceSpy.execute.and.returnValue(Promise.resolve());

      // Act
      await service.cleanStocks(commercialUsername);

      // Assert
      expect(databaseServiceSpy.execute).toHaveBeenCalledWith(
        jasmine.stringContaining('DELETE FROM tontine_stocks'),
        [commercialUsername]
      );
    });

    it('should throw error when commercialUsername is empty', async () => {
      // Act & Assert
      await expectAsync(service.cleanStocks('')).toBeRejectedWithError(
        'commercialUsername est requis pour le nettoyage des stocks'
      );
    });

    it('should handle database errors during stock cleanup', async () => {
      // Arrange
      databaseServiceSpy.execute.and.returnValue(
        Promise.reject(new Error('Delete failed'))
      );

      // Act & Assert
      await expectAsync(service.cleanStocks('testuser')).toBeRejectedWithError(
        /Échec du nettoyage des stocks/
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero items to delete', async () => {
      // Arrange
      const commercialUsername = 'testuser';
      const sessionId = 'session-123';
      
      databaseServiceSpy.getTontineSession.and.returnValue(Promise.resolve({ id: sessionId }));
      databaseServiceSpy.query.and.returnValues(
        Promise.resolve({ values: [{ count: 0 }] }), // members count
        Promise.resolve({ values: [{ count: 0 }] }), // collections count
        Promise.resolve({ values: [{ count: 0 }] }) // stocks count
      );
      databaseServiceSpy.execute.and.returnValue(Promise.resolve());

      // Act
      const result: CleanupResult = await service.cleanTontineData(commercialUsername);

      // Assert
      expect(result.success).toBe(true);
      expect(result.membersDeleted).toBe(0);
      expect(result.collectionsDeleted).toBe(0);
      expect(result.stocksDeleted).toBe(0);
    });

    it('should handle whitespace-only commercialUsername', async () => {
      // Act & Assert
      await expectAsync(service.cleanTontineData('   ')).toBeRejectedWithError(
        'commercialUsername est requis pour le nettoyage des données'
      );
    });

    it('should handle null query results gracefully', async () => {
      // Arrange
      const commercialUsername = 'testuser';
      const sessionId = 'session-123';
      
      databaseServiceSpy.getTontineSession.and.returnValue(Promise.resolve({ id: sessionId }));
      databaseServiceSpy.query.and.returnValues(
        Promise.resolve({ values: null }), // null values
        Promise.resolve({ values: [] }), // empty values
        Promise.resolve(null) // null result
      );
      databaseServiceSpy.execute.and.returnValue(Promise.resolve());

      // Act
      const result: CleanupResult = await service.cleanTontineData(commercialUsername);

      // Assert
      expect(result.success).toBe(true);
      expect(result.membersDeleted).toBe(0);
      expect(result.collectionsDeleted).toBe(0);
      expect(result.stocksDeleted).toBe(0);
    });
  });
});
