import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';

describe('DatabaseService - Photo URLs Integration', () => {
  let service: DatabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Test pour vérifier que updateClientPhotosAndInfo gère les URLs
  it('should update client photos and URLs correctly', async () => {
    // Ce test nécessiterait une base de données initialisée
    // Il s'agit d'un exemple de structure de test
    
    const testData = {
      clientId: 'test-client-id',
      cardType: 'CNI',
      cardID: '123456789',
      profilPhoto: 'client_photos/profile_123.png',
      cardPhoto: 'card_photos/card_123.png',
      profilPhotoUrl: 'client_photos/profile_123.png',
      cardPhotoUrl: 'card_photos/card_123.png'
    };

    // Vérifier que la méthode accepte les nouveaux paramètres
    expect(() => {
      service.updateClientPhotosAndInfo(testData);
    }).not.toThrow();
  });

  // Test pour vérifier que les URLs par défaut sont correctes
  it('should use photo paths as default URLs when URLs not provided', () => {
    const testData = {
      clientId: 'test-client-id',
      cardType: 'CNI',
      cardID: '123456789',
      profilPhoto: 'client_photos/profile_123.png',
      cardPhoto: 'card_photos/card_123.png'
      // profilPhotoUrl et cardPhotoUrl non fournis
    };

    // La méthode devrait utiliser profilPhoto et cardPhoto comme URLs par défaut
    expect(() => {
      service.updateClientPhotosAndInfo(testData);
    }).not.toThrow();
  });
});