import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlerService } from '../service/error-handler.service';

/**
 * Mixin pour ajouter des capacités de gestion d'erreur aux composants
 */
export class ErrorHandlingMixin {
  
  constructor(protected errorHandler: ErrorHandlerService) {}

  /**
   * Gère une erreur HTTP et affiche le message approprié
   * @param error L'erreur HTTP reçue
   * @param customTitle Titre personnalisé (optionnel)
   * @param customMessage Message personnalisé (optionnel, remplace le message du backend)
   */
  protected handleError(
    error: HttpErrorResponse | any, 
    customTitle?: string, 
    customMessage?: string
  ): void {
    if (customMessage) {
      // Utiliser le message personnalisé
      this.errorHandler.showError({ message: customMessage }, customTitle);
    } else {
      // Utiliser le message du backend
      this.errorHandler.showError(error, customTitle);
    }
  }

  /**
   * Extrait le message d'erreur sans l'afficher
   * @param error L'erreur HTTP reçue
   * @returns Le message d'erreur
   */
  protected getErrorMessage(error: HttpErrorResponse | any): string {
    return this.errorHandler.getErrorMessage(error);
  }

  /**
   * Vérifie si une erreur est de type spécifique
   * @param error L'erreur HTTP reçue
   * @param statusCode Le code de statut à vérifier
   * @returns true si l'erreur correspond au code de statut
   */
  protected isErrorType(error: HttpErrorResponse | any, statusCode: number): boolean {
    return this.errorHandler.isErrorType(error, statusCode);
  }

  /**
   * Gère les erreurs courantes avec des actions spécifiques
   * @param error L'erreur HTTP reçue
   * @param onUnauthorized Action à exécuter en cas d'erreur 401
   * @param onForbidden Action à exécuter en cas d'erreur 403
   * @param onNotFound Action à exécuter en cas d'erreur 404
   * @param onServerError Action à exécuter en cas d'erreur 500+
   */
  protected handleCommonErrors(
    error: HttpErrorResponse | any,
    options?: {
      onUnauthorized?: () => void;
      onForbidden?: () => void;
      onNotFound?: () => void;
      onServerError?: () => void;
      showAlert?: boolean;
      customTitle?: string;
    }
  ): void {
    const { 
      onUnauthorized, 
      onForbidden, 
      onNotFound, 
      onServerError,
      showAlert = true,
      customTitle
    } = options || {};

    // Exécuter les actions spécifiques
    switch (error?.status) {
      case 401:
        if (onUnauthorized) onUnauthorized();
        break;
      case 403:
        if (onForbidden) onForbidden();
        break;
      case 404:
        if (onNotFound) onNotFound();
        break;
      default:
        if (error?.status >= 500 && onServerError) {
          onServerError();
        }
        break;
    }

    // Afficher l'alerte si demandé
    if (showAlert) {
      this.handleError(error, customTitle);
    }
  }
}

/**
 * Interface pour les composants qui utilisent la gestion d'erreur
 */
export interface ErrorHandlingComponent {
  handleError(error: HttpErrorResponse | any, customTitle?: string, customMessage?: string): void;
  getErrorMessage(error: HttpErrorResponse | any): string;
  isErrorType(error: HttpErrorResponse | any, statusCode: number): boolean;
  handleCommonErrors(error: HttpErrorResponse | any, options?: any): void;
}