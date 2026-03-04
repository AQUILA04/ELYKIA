import { TestBed } from '@angular/core/testing';
import { ErrorHandlerService } from './error-handler.service';
import {
  SyncError,
  SyncContext,
  SyncErrorType,
  ErrorHandlingResult
} from '../../models/tontine-sync.models';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorHandlerService]
    });
    service = TestBed.inject(ErrorHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('handleSyncError', () => {
    let mockContext: SyncContext;

    beforeEach(() => {
      mockContext = {
        sessionId: 'test-session-123',
        commercialUsername: 'testuser',
        currentStep: 'syncMembers',
        currentPage: 1,
        timestamp: new Date('2024-01-15T10:00:00Z')
      };
    });

    it('should handle network error with retry strategy', () => {
      const networkError: SyncError = {
        type: SyncErrorType.NETWORK,
        message: 'Connection timeout',
        context: mockContext,
        timestamp: new Date(),
        retryable: true
      };

      const result = service.handleSyncError(networkError, mockContext);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(true);
      expect(result.shouldRollback).toBe(false);
      expect(result.userMessage).toContain('Erreur de connexion réseau');
      expect(result.userMessage).toContain('vérifier votre connexion');
    });

    it('should handle database error with rollback strategy', () => {
      const dbError: SyncError = {
        type: SyncErrorType.DATABASE,
        message: 'Insert failed',
        context: mockContext,
        timestamp: new Date(),
        retryable: false
      };

      const result = service.handleSyncError(dbError, mockContext);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRollback).toBe(true);
      expect(result.userMessage).toContain('Erreur de base de données');
      expect(result.userMessage).toContain('données précédentes ont été préservées');
    });

    it('should handle validation error without retry or rollback', () => {
      const validationError: SyncError = {
        type: SyncErrorType.VALIDATION,
        message: 'Invalid data structure',
        context: mockContext,
        timestamp: new Date(),
        retryable: false
      };

      const result = service.handleSyncError(validationError, mockContext);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRollback).toBe(false);
      expect(result.userMessage).toContain('Données invalides');
      expect(result.userMessage).toContain('page de données a été rejetée');
    });

    it('should handle timeout error without retry or rollback', () => {
      const timeoutError: SyncError = {
        type: SyncErrorType.TIMEOUT,
        message: 'Operation exceeded time limit',
        context: mockContext,
        timestamp: new Date(),
        retryable: false
      };

      const result = service.handleSyncError(timeoutError, mockContext);

      expect(result.handled).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRollback).toBe(false);
      expect(result.userMessage).toContain('pris trop de temps');
      expect(result.userMessage).toContain('annulée');
    });
  });

  describe('shouldRetry', () => {
    it('should return true for retryable network errors', () => {
      const error: SyncError = {
        type: SyncErrorType.NETWORK,
        message: 'Network error',
        context: {} as SyncContext,
        timestamp: new Date(),
        retryable: true
      };

      expect(service.shouldRetry(error)).toBe(true);
    });

    it('should return false for non-retryable network errors', () => {
      const error: SyncError = {
        type: SyncErrorType.NETWORK,
        message: 'Network error',
        context: {} as SyncContext,
        timestamp: new Date(),
        retryable: false
      };

      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should return false for database errors', () => {
      const error: SyncError = {
        type: SyncErrorType.DATABASE,
        message: 'DB error',
        context: {} as SyncContext,
        timestamp: new Date(),
        retryable: false
      };

      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should return false for validation errors', () => {
      const error: SyncError = {
        type: SyncErrorType.VALIDATION,
        message: 'Validation error',
        context: {} as SyncContext,
        timestamp: new Date(),
        retryable: false
      };

      expect(service.shouldRetry(error)).toBe(false);
    });

    it('should return false for timeout errors', () => {
      const error: SyncError = {
        type: SyncErrorType.TIMEOUT,
        message: 'Timeout error',
        context: {} as SyncContext,
        timestamp: new Date(),
        retryable: false
      };

      expect(service.shouldRetry(error)).toBe(false);
    });
  });

  describe('shouldRollback', () => {
    it('should return true only for database errors', () => {
      const dbError: SyncError = {
        type: SyncErrorType.DATABASE,
        message: 'DB error',
        context: {} as SyncContext,
        timestamp: new Date(),
        retryable: false
      };

      expect(service.shouldRollback(dbError)).toBe(true);
    });

    it('should return false for network errors', () => {
      const networkError: SyncError = {
        type: SyncErrorType.NETWORK,
        message: 'Network error',
        context: {} as SyncContext,
        timestamp: new Date(),
        retryable: true
      };

      expect(service.shouldRollback(networkError)).toBe(false);
    });

    it('should return false for validation errors', () => {
      const validationError: SyncError = {
        type: SyncErrorType.VALIDATION,
        message: 'Validation error',
        context: {} as SyncContext,
        timestamp: new Date(),
        retryable: false
      };

      expect(service.shouldRollback(validationError)).toBe(false);
    });

    it('should return false for timeout errors', () => {
      const timeoutError: SyncError = {
        type: SyncErrorType.TIMEOUT,
        message: 'Timeout error',
        context: {} as SyncContext,
        timestamp: new Date(),
        retryable: false
      };

      expect(service.shouldRollback(timeoutError)).toBe(false);
    });
  });

  describe('Error Classification and Strategy', () => {
    let mockContext: SyncContext;

    beforeEach(() => {
      mockContext = {
        sessionId: 'test-session',
        commercialUsername: 'user',
        currentStep: 'test',
        timestamp: new Date()
      };
    });

    it('should classify network errors as retryable without rollback', () => {
      const error: SyncError = {
        type: SyncErrorType.NETWORK,
        message: 'Connection failed',
        context: mockContext,
        timestamp: new Date(),
        retryable: true
      };

      const result = service.handleSyncError(error, mockContext);

      expect(result.shouldRetry).toBe(true);
      expect(result.shouldRollback).toBe(false);
    });

    it('should classify database errors as non-retryable with rollback', () => {
      const error: SyncError = {
        type: SyncErrorType.DATABASE,
        message: 'Insert failed',
        context: mockContext,
        timestamp: new Date(),
        retryable: false
      };

      const result = service.handleSyncError(error, mockContext);

      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRollback).toBe(true);
    });

    it('should classify validation errors as non-retryable without rollback', () => {
      const error: SyncError = {
        type: SyncErrorType.VALIDATION,
        message: 'Invalid structure',
        context: mockContext,
        timestamp: new Date(),
        retryable: false
      };

      const result = service.handleSyncError(error, mockContext);

      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRollback).toBe(false);
    });

    it('should classify timeout errors as non-retryable without rollback', () => {
      const error: SyncError = {
        type: SyncErrorType.TIMEOUT,
        message: 'Operation timeout',
        context: mockContext,
        timestamp: new Date(),
        retryable: false
      };

      const result = service.handleSyncError(error, mockContext);

      expect(result.shouldRetry).toBe(false);
      expect(result.shouldRollback).toBe(false);
    });
  });

  describe('User Messages', () => {
    let mockContext: SyncContext;

    beforeEach(() => {
      mockContext = {
        sessionId: 'test-session',
        commercialUsername: 'user',
        currentStep: 'test',
        timestamp: new Date()
      };
    });

    it('should provide explicit network error message (Requirement 3.1)', () => {
      const error: SyncError = {
        type: SyncErrorType.NETWORK,
        message: 'Timeout',
        context: mockContext,
        timestamp: new Date(),
        retryable: true
      };

      const result = service.handleSyncError(error, mockContext);

      expect(result.userMessage).toContain('Erreur de connexion réseau');
      expect(result.userMessage).toContain('Timeout');
      expect(result.userMessage).toContain('connexion internet');
    });

    it('should provide informative database error message (Requirement 3.2)', () => {
      const error: SyncError = {
        type: SyncErrorType.DATABASE,
        message: 'Constraint violation',
        context: mockContext,
        timestamp: new Date(),
        retryable: false
      };

      const result = service.handleSyncError(error, mockContext);

      expect(result.userMessage).toContain('Erreur de base de données');
      expect(result.userMessage).toContain('Constraint violation');
      expect(result.userMessage).toContain('données précédentes');
    });

    it('should provide clear validation error message (Requirement 3.3)', () => {
      const error: SyncError = {
        type: SyncErrorType.VALIDATION,
        message: 'Missing required field',
        context: mockContext,
        timestamp: new Date(),
        retryable: false
      };

      const result = service.handleSyncError(error, mockContext);

      expect(result.userMessage).toContain('Données invalides');
      expect(result.userMessage).toContain('Missing required field');
      expect(result.userMessage).toContain('rejetée');
    });
  });

  describe('Edge Cases', () => {
    let mockContext: SyncContext;

    beforeEach(() => {
      mockContext = {
        sessionId: 'test-session',
        commercialUsername: 'user',
        currentStep: 'test',
        timestamp: new Date()
      };
    });

    it('should handle error with empty message', () => {
      const error: SyncError = {
        type: SyncErrorType.NETWORK,
        message: '',
        context: mockContext,
        timestamp: new Date(),
        retryable: true
      };

      const result = service.handleSyncError(error, mockContext);

      expect(result.handled).toBe(true);
      expect(result.userMessage).toBeTruthy();
    });

    it('should handle error with undefined currentPage in context', () => {
      const contextWithoutPage: SyncContext = {
        sessionId: 'test-session',
        commercialUsername: 'user',
        currentStep: 'test',
        timestamp: new Date()
      };

      const error: SyncError = {
        type: SyncErrorType.NETWORK,
        message: 'Error',
        context: contextWithoutPage,
        timestamp: new Date(),
        retryable: true
      };

      const result = service.handleSyncError(error, contextWithoutPage);

      expect(result.handled).toBe(true);
    });
  });
});
