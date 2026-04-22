import { TestBed } from '@angular/core/testing';
import { DataCleanerService } from './data-cleaner.service';
import { DatabaseService } from '../database.service';

/**
 * Tests d'intégration pour DataCleanerService
 * Ces tests vérifient l'intégration avec DatabaseService
 */
describe('DataCleanerService Integration Tests', () => {
  let service: DataCleanerService;
  let databaseService: DatabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataCleanerService,
        DatabaseService
      ]
    });

    service = TestBed.inject(DataCleanerService);
    databaseService = TestBed.inject(DatabaseService);
  });

  it('should create service with database dependency', () => {
    expect(service).toBeTruthy();
    expect(databaseService).toBeTruthy();
  });

  it('should implement IDataCleaner interface', () => {
    // Vérifier que toutes les méthodes de l'interface sont présentes
    expect(typeof service.cleanTontineData).toBe('function');
    expect(typeof service.cleanMembers).toBe('function');
    expect(typeof service.cleanCollections).toBe('function');
    expect(typeof service.cleanStocks).toBe('function');
  });

  it('should validate parameters before executing cleanup', async () => {
    // Test avec paramètres invalides
    await expectAsync(service.cleanTontineData('')).toBeRejected();
    await expectAsync(service.cleanMembers('', 'user')).toBeRejected();
    await expectAsync(service.cleanMembers('session', '')).toBeRejected();
    await expectAsync(service.cleanCollections('')).toBeRejected();
    await expectAsync(service.cleanStocks('')).toBeRejected();
  });
});
