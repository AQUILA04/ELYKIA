import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlerService } from './error-handler.service';
import { AlertService } from './alert.service';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let alertServiceSpy: jasmine.SpyObj<AlertService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AlertService', ['showError']);

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: AlertService, useValue: spy }
      ]
    });
    
    service = TestBed.inject(ErrorHandlerService);
    alertServiceSpy = TestBed.inject(AlertService) as jasmine.SpyObj<AlertService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('extractErrorMessage', () => {
    it('should extract message from backend API error', () => {
      const error = {
        status: 400,
        error: {
          message: 'Le client a déjà un crédit en cours',
          code: 'CREDIT_ALREADY_EXISTS'
        }
      };

      const result = service.extractErrorMessage(error);
      
      expect(result.message).toBe('Le client a déjà un crédit en cours');
      expect(result.code).toBe('CREDIT_ALREADY_EXISTS');
      expect(result.statusCode).toBe(400);
    });

    it('should extract message from string error', () => {
      const error = {
        status: 500,
        error: 'Erreur interne du serveur'
      };

      const result = service.extractErrorMessage(error);
      
      expect(result.message).toBe('Erreur interne du serveur');
      expect(result.code).toBe('API_STRING_ERROR');
    });

    it('should handle network errors', () => {
      const error = {
        status: 0,
        error: new ErrorEvent('Network Error', {
          message: 'Impossible de contacter le serveur'
        })
      };

      const result = service.extractErrorMessage(error);
      
      expect(result.message).toBe('Impossible de contacter le serveur');
      expect(result.code).toBe('CLIENT_ERROR');
    });

    it('should provide default message for HTTP 404', () => {
      const error = {
        status: 404,
        statusText: 'Not Found'
      };

      const result = service.extractErrorMessage(error);
      
      expect(result.message).toBe('Ressource non trouvée.');
      expect(result.code).toBe('NOT_FOUND');
    });

    it('should provide default message for HTTP 401', () => {
      const error = {
        status: 401,
        statusText: 'Unauthorized'
      };

      const result = service.extractErrorMessage(error);
      
      expect(result.message).toBe('Session expirée. Veuillez vous reconnecter.');
      expect(result.code).toBe('UNAUTHORIZED');
    });

    it('should provide default message for HTTP 500', () => {
      const error = {
        status: 500,
        statusText: 'Internal Server Error'
      };

      const result = service.extractErrorMessage(error);
      
      expect(result.message).toBe('Erreur serveur interne. Veuillez réessayer plus tard.');
      expect(result.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('showError', () => {
    it('should call AlertService.showError with extracted message', () => {
      const error = {
        status: 400,
        error: {
          message: 'Données invalides'
        }
      };

      service.showError(error, 'Titre personnalisé');

      expect(alertServiceSpy.showError).toHaveBeenCalledWith(
        'Données invalides',
        'Titre personnalisé'
      );
    });

    it('should use default title when none provided', () => {
      const error = {
        status: 500
      };

      service.showError(error);

      expect(alertServiceSpy.showError).toHaveBeenCalledWith(
        jasmine.any(String),
        'Erreur Serveur'
      );
    });
  });

  describe('getErrorMessage', () => {
    it('should return only the message string', () => {
      const error = {
        status: 400,
        error: {
          message: 'Message de test'
        }
      };

      const message = service.getErrorMessage(error);
      
      expect(message).toBe('Message de test');
    });
  });

  describe('isErrorType', () => {
    it('should return true for matching status code', () => {
      const error = { status: 404 };
      
      expect(service.isErrorType(error, 404)).toBe(true);
    });

    it('should return false for non-matching status code', () => {
      const error = { status: 404 };
      
      expect(service.isErrorType(error, 500)).toBe(false);
    });
  });
});