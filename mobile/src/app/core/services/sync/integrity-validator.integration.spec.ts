import { TestBed } from '@angular/core/testing';
import { IntegrityValidatorService } from './integrity-validator.service';
import {
  ExpectedData,
  ActualData
} from '../../models/tontine-sync.models';

/**
 * Tests d'intégration pour IntegrityValidator
 * Valide les exigences 4.1 et 4.2
 */
describe('IntegrityValidatorService - Integration Tests', () => {
  let service: IntegrityValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IntegrityValidatorService]
    });
    service = TestBed.inject(IntegrityValidatorService);
  });

  /**
   * Exigence 4.1: QUAND une Session_Sync est terminée, 
   * LE Système_Sync DOIT calculer et comparer les checksums des données
   */
  describe('Exigence 4.1 - Calcul et comparaison des checksums', () => {
    it('should calculate checksums for synchronized data', () => {
      const members = [
        { id: 1, name: 'Member 1', sessionId: 'session-1' },
        { id: 2, name: 'Member 2', sessionId: 'session-1' },
        { id: 3, name: 'Member 3', sessionId: 'session-1' }
      ];

      const checksum = service.calculateChecksum(members);

      expect(checksum).toBeTruthy();
      expect(typeof checksum).toBe('string');
      expect(checksum).not.toBe('0');
    });

    it('should compare checksums to detect data integrity issues', () => {
      const originalData = [
        { id: 1, name: 'Member 1' },
        { id: 2, name: 'Member 2' }
      ];

      const modifiedData = [
        { id: 1, name: 'Member 1 Modified' },
        { id: 2, name: 'Member 2' }
      ];

      const checksum1 = service.calculateChecksum(originalData);
      const checksum2 = service.calculateChecksum(modifiedData);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should produce consistent checksums for identical data', () => {
      const data = [
        { id: 1, name: 'Member 1' },
        { id: 2, name: 'Member 2' }
      ];

      const checksum1 = service.calculateChecksum(data);
      const checksum2 = service.calculateChecksum(data);
      const checksum3 = service.calculateChecksum([...data]);

      expect(checksum1).toBe(checksum2);
      expect(checksum2).toBe(checksum3);
    });
  });

  /**
   * Exigence 4.2: QUAND des Données_Tontine sont sauvegardées, 
   * LE Système_Sync DOIT valider la structure et les contraintes de chaque enregistrement
   */
  describe('Exigence 4.2 - Validation de structure et contraintes', () => {
    it('should validate structure of tontine member data', () => {
      const members = [
        { id: 1, name: 'Member 1', sessionId: 'session-1' },
        { id: 2, name: 'Member 2', sessionId: 'session-1' },
        { id: 3, name: 'Member 3', sessionId: 'session-1' }
      ];

      const result = service.validateDataStructure(members);

      expect(result.isValid).toBe(true);
      expect(result.validatedCount).toBe(3);
      expect(result.errors).toEqual([]);
    });

    it('should validate structure of tontine collection data', () => {
      const collections = [
        { id: 1, memberId: 1, amount: 1000, date: '2024-01-01' },
        { id: 2, memberId: 2, amount: 2000, date: '2024-01-02' }
      ];

      const result = service.validateDataStructure(collections);

      expect(result.isValid).toBe(true);
      expect(result.validatedCount).toBe(2);
    });

    it('should validate structure of tontine stock data', () => {
      const stocks = [
        { id: 1, productId: 1, quantity: 100, sessionId: 'session-1' },
        { id: 2, productId: 2, quantity: 200, sessionId: 'session-1' }
      ];

      const result = service.validateDataStructure(stocks);

      expect(result.isValid).toBe(true);
      expect(result.validatedCount).toBe(2);
    });

    it('should detect and report constraint violations', () => {
      const invalidMembers = [
        { id: 1, name: 'Valid Member' },
        { name: 'Member without ID' }, // Violation: missing ID
        null, // Violation: null item
        { id: '', name: 'Empty ID' }, // Violation: empty ID
        { id: 5, name: 'Valid Member 2' }
      ];

      const result = service.validateDataStructure(invalidMembers);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.validatedCount).toBe(2); // Only 2 valid items
    });

    it('should validate each record individually', () => {
      const mixedData = [
        { id: 1, name: 'Valid 1' },
        { id: 2, name: 'Valid 2' },
        { name: 'Invalid - no ID' },
        { id: 4, name: 'Valid 3' }
      ];

      const result = service.validateDataStructure(mixedData);

      expect(result.isValid).toBe(false);
      expect(result.validatedCount).toBe(3);
      expect(result.errors.length).toBe(1);
    });
  });

  /**
   * Scénario complet: Validation après synchronisation
   * Combine les exigences 4.1 et 4.2
   */
  describe('Scénario complet - Validation post-synchronisation', () => {
    it('should perform complete validation after sync (257 members scenario)', () => {
      // Simuler la synchronisation de 257 membres (3 pages de 100, 100, 57)
      const expected: ExpectedData = {
        memberCount: 257,
        collectionCount: 0,
        stockCount: 0
      };

      const actual: ActualData = {
        memberCount: 257,
        collectionCount: 0,
        stockCount: 0
      };

      // Valider les counts
      const validationResult = service.validateSyncResult(expected, actual);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.expectedCount).toBe(257);
      expect(validationResult.actualCount).toBe(257);
      expect(validationResult.missingItems).toEqual([]);
      expect(validationResult.checksumMatch).toBe(true);
    });

    it('should detect the 257 vs 190-211 members bug', () => {
      // Reproduire le bug mentionné dans les exigences
      const expected: ExpectedData = {
        memberCount: 257,
        collectionCount: 0,
        stockCount: 0
      };

      const actual: ActualData = {
        memberCount: 190, // Bug: seulement 190 sauvegardés au lieu de 257
        collectionCount: 0,
        stockCount: 0
      };

      const validationResult = service.validateSyncResult(expected, actual);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.expectedCount).toBe(257);
      expect(validationResult.actualCount).toBe(190);
      expect(validationResult.missingItems).toContain('67 membre(s) manquant(s)');
    });

    it('should validate structure and calculate checksum for complete dataset', () => {
      // Créer un dataset complet
      const members = Array.from({ length: 257 }, (_, i) => ({
        id: i + 1,
        name: `Member ${i + 1}`,
        sessionId: 'session-1'
      }));

      // Valider la structure
      const structureResult = service.validateDataStructure(members);
      expect(structureResult.isValid).toBe(true);
      expect(structureResult.validatedCount).toBe(257);

      // Calculer le checksum
      const checksum = service.calculateChecksum(members);
      expect(checksum).toBeTruthy();
      expect(checksum).not.toBe('0');

      // Vérifier que le checksum change si les données changent
      members[0].name = 'Modified Member';
      const newChecksum = service.calculateChecksum(members);
      expect(newChecksum).not.toBe(checksum);
    });
  });
});
