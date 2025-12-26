import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertService } from './alert.service';

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
  statusCode?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {

  constructor(private alertService: AlertService) {}

  /**
   * Extrait le message d'erreur complet du backend
   * @param error L'erreur HTTP reçue
   * @returns Le message d'erreur formaté
   */
  extractErrorMessage(error: HttpErrorResponse | any): ErrorInfo {
    let message = 'Une erreur inattendue s\'est produite.';
    let code = 'UNKNOWN_ERROR';
    let details = null;
    let statusCode = error?.status || 0;

    // Cas 1: Erreur avec structure API standard { message: "...", code: "...", data: ... }
    if (error?.error?.message) {
      message = error.error.message;
      code = error.error.code || 'API_ERROR';
      details = error.error.data || error.error.details;
    }
    // Cas 2: Erreur avec message direct dans error.error (string)
    else if (error?.error && typeof error.error === 'string') {
      message = error.error;
      code = 'API_STRING_ERROR';
    }
    // Cas 3: Erreur avec message dans error.message
    else if (error?.message) {
      message = error.message;
      code = 'ERROR_MESSAGE';
    }
    // Cas 4: Erreur côté client (réseau, etc.)
    else if (error?.error instanceof ErrorEvent) {
      message = error.error.message || 'Erreur de connexion';
      code = 'CLIENT_ERROR';
    }
    // Cas 5: Erreurs HTTP standard basées sur le code de statut
    else {
      const errorInfo = this.getStandardHttpErrorMessage(statusCode);
      message = errorInfo.message;
      code = errorInfo.code;
    }

    return {
      message,
      code,
      details,
      statusCode
    };
  }

  /**
   * Affiche une erreur avec le service d'alerte
   * @param error L'erreur HTTP reçue
   * @param customTitle Titre personnalisé (optionnel)
   */
  showError(error: HttpErrorResponse | any, customTitle?: string): void {
    const errorInfo = this.extractErrorMessage(error);
    const title = customTitle || this.getErrorTitle(errorInfo.statusCode);
    
    // Log pour debug (sans informations sensibles)
    console.error('Error Details:', {
      message: errorInfo.message,
      code: errorInfo.code,
      statusCode: errorInfo.statusCode,
      timestamp: new Date().toISOString()
    });

    this.alertService.showError(errorInfo.message, title);
  }

  /**
   * Retourne juste le message d'erreur sans l'afficher
   * @param error L'erreur HTTP reçue
   * @returns Le message d'erreur
   */
  getErrorMessage(error: HttpErrorResponse | any): string {
    return this.extractErrorMessage(error).message;
  }

  /**
   * Vérifie si une erreur est de type spécifique
   * @param error L'erreur HTTP reçue
   * @param statusCode Le code de statut à vérifier
   * @returns true si l'erreur correspond au code de statut
   */
  isErrorType(error: HttpErrorResponse | any, statusCode: number): boolean {
    return error?.status === statusCode;
  }

  /**
   * Messages d'erreur standard basés sur les codes HTTP
   */
  private getStandardHttpErrorMessage(statusCode: number): { message: string; code: string } {
    switch (statusCode) {
      case 400:
        return {
          message: 'Données invalides. Veuillez vérifier votre saisie.',
          code: 'BAD_REQUEST'
        };
      case 401:
        return {
          message: 'Session expirée. Veuillez vous reconnecter.',
          code: 'UNAUTHORIZED'
        };
      case 403:
        return {
          message: 'Vous n\'avez pas les permissions nécessaires pour cette opération.',
          code: 'FORBIDDEN'
        };
      case 404:
        return {
          message: 'Ressource non trouvée.',
          code: 'NOT_FOUND'
        };
      case 409:
        return {
          message: 'Conflit de données. L\'opération ne peut pas être effectuée.',
          code: 'CONFLICT'
        };
      case 422:
        return {
          message: 'Données non valides. Veuillez corriger les erreurs et réessayer.',
          code: 'UNPROCESSABLE_ENTITY'
        };
      case 429:
        return {
          message: 'Trop de tentatives. Veuillez patienter avant de réessayer.',
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
        if (statusCode >= 500) {
          return {
            message: 'Erreur serveur. Veuillez réessayer plus tard.',
            code: 'SERVER_ERROR'
          };
        } else if (statusCode >= 400) {
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
   * Retourne un titre approprié basé sur le code de statut
   */
  private getErrorTitle(statusCode?: number): string {
    if (!statusCode) return 'Erreur';

    if (statusCode >= 500) {
      return 'Erreur Serveur';
    } else if (statusCode === 401) {
      return 'Authentification Requise';
    } else if (statusCode === 403) {
      return 'Accès Refusé';
    } else if (statusCode === 404) {
      return 'Non Trouvé';
    } else if (statusCode >= 400) {
      return 'Erreur de Saisie';
    } else {
      return 'Erreur';
    }
  }
}