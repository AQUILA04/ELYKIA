import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ORDER_VALIDATION_MESSAGES } from '../types/order.types';

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  operation?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  /**
   * Gère les erreurs HTTP de manière centralisée
   */
  handleHttpError(error: HttpErrorResponse, operation?: string): Observable<never> {
    const errorInfo = this.processHttpError(error, operation);
    
    // Logger l'erreur pour le débogage
    this.logError(errorInfo);
    
    return throwError(() => new Error(errorInfo.message));
  }

  /**
   * Traite une erreur HTTP et retourne les informations d'erreur formatées
   */
  private processHttpError(error: HttpErrorResponse, operation?: string): ErrorInfo {
    let errorMessage = 'Une erreur inattendue s\'est produite.';
    let errorCode = 'UNKNOWN_ERROR';

    // Vérifier si l'API a retourné un message d'erreur spécifique
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
      errorCode = error.error.code || 'API_ERROR';
    } else if (error.error && typeof error.error === 'string') {
      errorMessage = error.error;
      errorCode = 'API_STRING_ERROR';
    } else {
      // Gérer différents codes de statut HTTP
      const statusErrorInfo = this.getStatusErrorInfo(error.status);
      errorMessage = statusErrorInfo.message;
      errorCode = statusErrorInfo.code;
    }

    return {
      message: errorMessage,
      code: errorCode,
      details: {
        status: error.status,
        statusText: error.statusText,
        url: error.url,
        operation
      },
      timestamp: new Date().toISOString(),
      operation
    };
  }

  /**
   * Retourne les informations d'erreur basées sur le code de statut HTTP
   */
  private getStatusErrorInfo(status: number): { message: string; code: string } {
    switch (status) {
      case 400:
        return {
          message: 'Données de commande invalides. Veuillez vérifier votre saisie.',
          code: 'BAD_REQUEST'
        };
      case 401:
        return {
          message: 'Session expirée. Veuillez vous reconnecter.',
          code: 'UNAUTHORIZED'
        };
      case 403:
        return {
          message: 'Permissions insuffisantes pour gérer les commandes.',
          code: 'FORBIDDEN'
        };
      case 404:
        return {
          message: 'Commande non trouvée.',
          code: 'NOT_FOUND'
        };
      case 409:
        return {
          message: 'Conflit : cette commande ne peut pas être modifiée dans son état actuel.',
          code: 'CONFLICT'
        };
      case 422:
        return {
          message: 'Données non valides. Veuillez corriger les erreurs et réessayer.',
          code: 'UNPROCESSABLE_ENTITY'
        };
      case 429:
        return {
          message: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
          code: 'TOO_MANY_REQUESTS'
        };
      case 500:
        return {
          message: 'Erreur serveur interne. Veuillez réessayer plus tard.',
          code: 'INTERNAL_SERVER_ERROR'
        };
      case 502:
        return {
          message: 'Service temporairement indisponible. Veuillez réessayer.',
          code: 'BAD_GATEWAY'
        };
      case 503:
        return {
          message: 'Service en maintenance. Veuillez réessayer plus tard.',
          code: 'SERVICE_UNAVAILABLE'
        };
      case 504:
        return {
          message: 'Délai d\'attente dépassé. Veuillez réessayer.',
          code: 'GATEWAY_TIMEOUT'
        };
      case 0:
        return {
          message: 'Erreur de connexion. Vérifiez votre connexion internet.',
          code: 'CONNECTION_ERROR'
        };
      default:
        if (status >= 500) {
          return {
            message: 'Erreur serveur. Veuillez réessayer plus tard.',
            code: 'SERVER_ERROR'
          };
        } else if (status >= 400) {
          return {
            message: 'Erreur de requête. Veuillez vérifier vos données.',
            code: 'CLIENT_ERROR'
          };
        } else {
          return {
            message: 'Une erreur inattendue s\'est produite.',
            code: 'UNKNOWN_ERROR'
          };
        }
    }
  }

  /**
   * Gère les erreurs de validation de formulaire
   */
  handleValidationError(field: string, errorType: string): string {
    const validationKey = `${field.toUpperCase()}_${errorType.toUpperCase()}` as keyof typeof ORDER_VALIDATION_MESSAGES;
    
    if (ORDER_VALIDATION_MESSAGES[validationKey]) {
      return ORDER_VALIDATION_MESSAGES[validationKey];
    }

    // Messages par défaut selon le type d'erreur
    switch (errorType) {
      case 'required':
        return 'Ce champ est requis';
      case 'min':
        return 'La valeur est trop petite';
      case 'max':
        return 'La valeur est trop grande';
      case 'minlength':
        return 'Le texte est trop court';
      case 'maxlength':
        return 'Le texte est trop long';
      case 'pattern':
        return 'Le format n\'est pas valide';
      case 'email':
        return 'L\'adresse email n\'est pas valide';
      default:
        return 'Valeur invalide';
    }
  }

  /**
   * Gère les erreurs métier spécifiques aux commandes
   */
  handleBusinessError(errorCode: string, context?: any): string {
    switch (errorCode) {
      case 'ORDER_NOT_MODIFIABLE':
        return ORDER_VALIDATION_MESSAGES.ORDER_CANNOT_BE_MODIFIED;
      case 'INVALID_STATUS_TRANSITION':
        return ORDER_VALIDATION_MESSAGES.STATUS_TRANSITION_INVALID;
      case 'INSUFFICIENT_STOCK':
        return 'Stock insuffisant pour cet article';
      case 'CLIENT_NOT_ACTIVE':
        return 'Ce client n\'est plus actif';
      case 'ARTICLE_NOT_AVAILABLE':
        return 'Cet article n\'est plus disponible';
      case 'DUPLICATE_ORDER':
        return 'Une commande similaire existe déjà';
      case 'ORDER_AMOUNT_EXCEEDED':
        return ORDER_VALIDATION_MESSAGES.AMOUNT_MAX;
      case 'ORDER_AMOUNT_TOO_LOW':
        return ORDER_VALIDATION_MESSAGES.AMOUNT_MIN;
      default:
        return 'Erreur métier : ' + errorCode;
    }
  }

  /**
   * Formate un message d'erreur pour l'affichage utilisateur
   */
  formatUserMessage(error: ErrorInfo): string {
    // Pour les erreurs de connexion, proposer des actions
    if (error.code === 'CONNECTION_ERROR') {
      return `${error.message}\n\nVérifiez votre connexion internet et réessayez.`;
    }

    // Pour les erreurs serveur, rassurer l'utilisateur
    if (error.code?.includes('SERVER')) {
      return `${error.message}\n\nNos équipes ont été notifiées et travaillent à résoudre le problème.`;
    }

    // Pour les erreurs d'autorisation, rediriger vers la connexion
    if (error.code === 'UNAUTHORIZED') {
      return `${error.message}\n\nVous allez être redirigé vers la page de connexion.`;
    }

    return error.message;
  }

  /**
   * Détermine si une erreur est récupérable (l'utilisateur peut réessayer)
   */
  isRecoverable(error: ErrorInfo): boolean {
    const recoverableCodes = [
      'CONNECTION_ERROR',
      'GATEWAY_TIMEOUT',
      'SERVICE_UNAVAILABLE',
      'TOO_MANY_REQUESTS',
      'INTERNAL_SERVER_ERROR'
    ];

    return recoverableCodes.includes(error.code || '');
  }

  /**
   * Détermine si une erreur nécessite une reconnexion
   */
  requiresReauth(error: ErrorInfo): boolean {
    return error.code === 'UNAUTHORIZED';
  }

  /**
   * Log l'erreur pour le débogage
   */
  private logError(errorInfo: ErrorInfo): void {
    console.error('Order Management Error:', {
      message: errorInfo.message,
      code: errorInfo.code,
      operation: errorInfo.operation,
      details: errorInfo.details,
      timestamp: errorInfo.timestamp
    });

    // En production, on pourrait envoyer les erreurs à un service de monitoring
    // comme Sentry, LogRocket, etc.
    if (this.isProductionEnvironment()) {
      this.sendToMonitoringService(errorInfo);
    }
  }

  /**
   * Vérifie si on est en environnement de production
   */
  private isProductionEnvironment(): boolean {
    // Cette logique dépend de votre configuration d'environnement
    return false; // À adapter selon votre setup
  }

  /**
   * Envoie l'erreur à un service de monitoring (placeholder)
   */
  private sendToMonitoringService(errorInfo: ErrorInfo): void {
    // Implémentation du service de monitoring
    // Exemple: Sentry.captureException(errorInfo);
  }
}