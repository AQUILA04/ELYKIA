import { TestBed } from '@angular/core/testing';
import { IntegrityValidatorService } from './integrity-validator.service';
import {
  ExpectedData,
  ActualData,
  ValidationResult,
  StructureValidationResult
} from '../../models/tontine-sync.models';

describe('IntegrityValidatorService', () => {
  let service: IntegrityValidatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IntegrityValidatorService]
    });
    service = TestBed.inject(IntegrityValidatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateSyncResult', () => {
    it('should return valid result when counts match exactly', () => {
      const expected: ExpectedData = {
        memberCount: 257,
        collectionCount: 100,
        stockCount: 50
      };

      const actual: ActualData = {
        memberCount: 257,
        collectionCount: 100,
        stockCount: 50
      };

      const result: ValidationResult = service.validateSyncResult(expected, actual);

      expect(result.isValid).toBe(true);
      expect(result.expectedCount).toBe(407);
      expect(result.actualCount).toBe(407);
      expect(result.missingItems).toEqual([]);
      expect(result.corruptedItems).toEqual([]);
      expect(result.checksumMatch).toBe(true);
    });

    it('should detect missing members', () => {
      const expected: ExpectedData = {
        memberCount: 257,
        collectionCount: 100,
        stockCount: 50
      };

      const actual: ActualData = {
        memberCount: 190,
        collectionCount: 100,
        stockCount: 50
      };

      const result: ValidationResult = service.validateSyncResult(expected, actual);

      expect(result.isValid).toBe(false);
      expect(result.expectedCount).toBe(407);
      expect(result.actualCount).toBe(340);
      expect(result.missingItems).toContain('67 membre(s) manquant(s)');
      expect(result.corruptedItems).toEqual([]);
      expect(result.checksumMatch).toBe(false);
    });

    it('should detect missing collections', () => {
      const expected: ExpectedData = {
        memberCount: 257,
        collectionCount: 100,
        stockCount: 50
      };

      const actual: ActualData = {
        memberCount: 257,
        collectionCount: 80,
        stockCount: 50
      };

      const result: ValidationResult = service.validateSyncResult(expected, actual);

      expect(result.isValid).toBe(false);
      expect(result.missingItems).toContain('20 collection(s) manquante(s)');
    });

    it('should detect missing stocks', () => {
      const expected: ExpectedData = {
        memberCount: 257,
        collectionCount: 100,
        stockCount: 50
      };

      const actual: ActualData = {
        memberCount: 257,
        collectionCount: 100,
        stockCount: 30
      };

      const result: ValidationResult = service.validateSyncResult(expected, actual);

      expect(result.isValid).toBe(false);
      expect(result.missingItems).toContain('20 stock(s) manquant(s)');
    });

    it('should detect extra items as corrupted', () => {
      const expected: ExpectedData = {
        memberCount: 257,
        collectionCount: 100,
        stockCount: 50
      };

      const actual: ActualData = {
        memberCount: 300,
        collectionCount: 100,
        stockCount: 50
      };

      const result: ValidationResult = service.validateSyncResult(expected, actual);

      expect(result.isValid).toBe(false);
      expect(result.corruptedItems).toContain('43 membre(s) en trop');
    });

    it('should detect multiple discrepancies', () => {
      const expected: ExpectedData = {
        memberCount: 257,
        collectionCount: 100,
        stockCount: 50
      };

      const actual: ActualData = {
        memberCount: 200,
        collectionCount: 110,
        stockCount: 40
      };

      const result: ValidationResult = service.validateSyncResult(expected, actual);

      expect(result.isValid).toBe(false);
      expect(result.missingItems.length).toBeGreaterThan(0);
      expect(result.corruptedItems.length).toBeGreaterThan(0);
    });

    it('should handle zero counts', () => {
      const expected: ExpectedData = {
        memberCount: 0,
        collectionCount: 0,
        stockCount: 0
      };

      const actual: ActualData = {
        memberCount: 0,
        collectionCount: 0,
        stockCount: 0
      };

      const result: ValidationResult = service.validateSyncResult(expected, actual);

      expect(result.isValid).toBe(true);
      expect(result.expectedCount).toBe(0);
      expect(result.actualCount).toBe(0);
    });
  });

  describe('validateDataStructure', () => {
    it('should validate correct data structure', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ];

      const result: StructureValidationResult = service.validateDataStructure(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.validatedCount).toBe(3);
    });

    it('should accept numeric zero as valid ID', () => {
      const data = [
        { id: 0, name: 'Item 0' },
        { id: 1, name: 'Item 1' }
      ];

      const result: StructureValidationResult = service.validateDataStructure(data);

      expect(result.isValid).toBe(true);
      expect(result.validatedCount).toBe(2);
    });

    it('should reject null items', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        null,
        { id: 3, name: 'Item 3' }
      ];

      const result: StructureValidationResult = service.validateDataStructure(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('null ou undefined');
      expect(result.validatedCount).toBe(2);
    });

    it('should reject undefined items', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        undefined,
        { id: 3, name: 'Item 3' }
      ];

      const result: StructureValidationResult = service.validateDataStructure(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.validatedCount).toBe(2);
    });

    it('should reject items without ID', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { name: 'Item without ID' },
        { id: 3, name: 'Item 3' }
      ];

      const result: StructureValidationResult = service.validateDataStructure(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('ID manquant');
      expect(result.validatedCount).toBe(2);
    });

    it('should reject items with empty string ID', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: '  ', name: 'Item with empty ID' },
        { id: 3, name: 'Item 3' }
      ];

      const result: StructureValidationResult = service.validateDataStructure(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('ID vide');
      expect(result.validatedCount).toBe(2);
    });

    it('should reject non-object items', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        'not an object',
        { id: 3, name: 'Item 3' }
      ];

      const result: StructureValidationResult = service.validateDataStructure(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('doit être un objet');
      expect(result.validatedCount).toBe(2);
    });

    it('should reject non-array input', () => {
      const data = 'not an array' as any;

      const result: StructureValidationResult = service.validateDataStructure(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Les données doivent être un tableau');
      expect(result.validatedCount).toBe(0);
    });

    it('should handle empty array', () => {
      const data: any[] = [];

      const result: StructureValidationResult = service.validateDataStructure(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.validatedCount).toBe(0);
    });

    it('should accumulate multiple errors', () => {
      const data = [
        { id: 1, name: 'Valid' },
        null,
        { name: 'No ID' },
        'not an object',
        { id: '', name: 'Empty ID' }
      ];

      const result: StructureValidationResult = service.validateDataStructure(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
      expect(result.validatedCount).toBe(1);
    });
  });

  describe('calculateChecksum', () => {
    it('should calculate checksum for valid data', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ];

      const checksum = service.calculateChecksum(data);

      expect(checksum).toBeTruthy();
      expect(typeof checksum).toBe('string');
      expect(checksum).not.toBe('0');
    });

    it('should return same checksum for same data', () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];

      const checksum1 = service.calculateChecksum(data);
      const checksum2 = service.calculateChecksum(data);

      expect(checksum1).toBe(checksum2);
    });

    it('should return same checksum regardless of order', () => {
      const data1 = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ];

      const data2 = [
        { id: 3, name: 'Item 3' },
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];

      const checksum1 = service.calculateChecksum(data1);
      const checksum2 = service.calculateChecksum(data2);

      expect(checksum1).toBe(checksum2);
    });

    it('should return different checksum for different data', () => {
      const data1 = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ];

      const data2 = [
        { id: 1, name: 'Item 1' },
        { id: 3, name: 'Item 3' }
      ];

      const checksum1 = service.calculateChecksum(data1);
      const checksum2 = service.calculateChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should return 0 for empty array', () => {
      const data: any[] = [];

      const checksum = service.calculateChecksum(data);

      expect(checksum).toBe('0');
    });

    it('should return 0 for non-array input', () => {
      const data = null as any;

      const checksum = service.calculateChecksum(data);

      expect(checksum).toBe('0');
    });

    it('should handle complex nested objects', () => {
      const data = [
        { id: 1, details: { name: 'Item 1', meta: { created: '2024-01-01' } } },
        { id: 2, details: { name: 'Item 2', meta: { created: '2024-01-02' } } }
      ];

      const checksum = service.calculateChecksum(data);

      expect(checksum).toBeTruthy();
      expect(checksum).not.toBe('0');
    });

    it('should detect changes in nested properties', () => {
      const data1 = [
        { id: 1, details: { name: 'Item 1' } }
      ];

      const data2 = [
        { id: 1, details: { name: 'Item 1 Modified' } }
      ];

      const checksum1 = service.calculateChecksum(data1);
      const checksum2 = service.calculateChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });
  });
});
