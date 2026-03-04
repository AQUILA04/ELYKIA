import { Injectable } from '@angular/core';
import {
  IErrorHandler,
  SyncError,
  SyncContext,
  ErrorHandlingResult,
  SyncErrorType
} from '../../models/tontine-sync.models';

/**
 * Service de gestion des erreurs de synchronisation
 * Responsabilité: Gérer les erreurs et déterminer les stratégies de récupération
 * 
 * Valide les exigences:
 * - 3.1: Affichage de messages d'erreur explicites pour les erreurs réseau
 * - 3.2: Logging et information utilisateur pour les erreurs de base de données
 * - 3.3: Rejet et signalement des pages corrompues ou incomplètes
 * - 3.5: Fourniture d'informations de diagnostic pour le débogage
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements IErrorHandler {

  constructor() {}

  /**
   * Gère une erreur de synchronisation et détermine la stratégie de récupération
   * @param error Erreur à gérer
   * @param context Contexte de l'erreur
   * @returns Résultat de gestion d'erreur avec stratégie recommandée
   */
  handleSyncError(error: SyncError, context: SyncContext): ErrorHandlingResult {
    // Logger l'erreur pour diagnostic (Exigence 3.5)
    this.logErrorForDiagnostics(error, context);

    // Déterminer la stratégie selon le type d'erreur
    const shouldRetry = this.shouldRetry(error);
    const shouldRollback = this.shouldRollback(error);
    const userMessage = this.generateUserMessage(error, context);

    return {
      handled: true,
      shouldRetry,
      shouldRollback,
      userMessage
    };
  }

  /**
   * Détermine si l'opération doit être retentée
   * Stratégie:
   * - Erreurs réseau: Retry avec backoff exponentiel (max 3 tentatives)
   * - Erreurs de base de données: Pas de retry
   * - Erreurs de validation: Pas de retry
   * - Timeout: Pas de retry
   * 
   * @param error Erreur à évaluer
   * @returns true si retry recommandé
   */
  shouldRetry(error: SyncError): boolean {
    // Seules les erreurs réseau sont retryables
    if (error.type === SyncErrorType.NETWORK) {
      return error.retryable;
    }

    // Tous les autres types d'erreur ne sont pas retryables
    return false;
  }

  /**
   * Détermine si un rollback doit être effectué
   * Stratégie:
   * - Erreurs réseau: Pas de rollback (retry possible)
   * - Erreurs de base de données: Rollback immédiat
   * - Erreurs de validation: Pas de rollback (arrêt propre)
   * - Timeout: Pas de rollback (annulation propre)
   * 
   * @param error Erreur à évaluer
   * @returns true si rollback nécessaire
   */
  shouldRollback(error: SyncError): boolean {
    // Rollback uniquement pour les erreurs de base de données
    // pour garantir l'intégrité des données (Exigence 3.2)
    return error.type === SyncErrorType.DATABASE;
  }

  /**
   * Génère un message utilisateur explicite selon le type d'erreur
   * @param error Erreur à traiter
   * @param context Contexte de l'erreur
   * @returns Message utilisateur formaté
   */
  private generateUserMessage(error: SyncError, context: SyncContext): string {
    switch (error.type) {
      case SyncErrorType.NETWORK:
        // Exigence 3.1: Message explicite pour erreur réseau
        return `Erreur de connexion réseau lors de la synchronisation. ${error.message}. ` +
               `Veuillez vérifier votre connexion internet et réessayer.`;

      case SyncErrorType.DATABASE:
        // Exigence 3.2: Information utilisateur pour erreur de base de données
        return `Erreur de base de données lors de la synchronisation. ${error.message}. ` +
               `Les données précédentes ont été préservées. Veuillez contacter le support si le problème persiste.`;

      case SyncErrorType.VALIDATION:
        // Exigence 3.3: Signalement des données corrompues ou incomplètes
        return `Données invalides détectées lors de la synchronisation. ${error.message}. ` +
               `La page de données a été rejetée. Veuillez réessayer la synchronisation.`;

      case SyncErrorType.TIMEOUT:
        return `La synchronisation a pris trop de temps et a été annulée. ${error.message}. ` +
               `Veuillez réessayer ultérieurement.`;

      default:
        return `Erreur inattendue lors de la synchronisation: ${error.message}`;
    }
  }

  /**
   * Enregistre l'erreur avec informations de diagnostic complètes
   * Exigence 3.5: Fournir des informations de diagnostic pour le débogage
   * 
   * @param error Erreur à logger
   * @param context Contexte de l'erreur
   */
  private logErrorForDiagnostics(error: SyncError, context: SyncContext): void {
    const diagnosticInfo = {
      errorType: error.type,
      errorMessage: error.message,
      timestamp: error.timestamp.toISOString(),
      retryable: error.retryable,
      context: {
        sessionId: context.sessionId,
        commercialUsername: context.commercialUsername,
        currentStep: context.currentStep,
        currentPage: context.currentPage,
        operationTimestamp: context.timestamp.toISOString()
      }
    };

    // Logger avec niveau approprié selon le type d'erreur
    if (error.type === SyncErrorType.DATABASE) {
      console.error('[ErrorHandler] Erreur critique de synchronisation:', diagnosticInfo);
    } else if (error.type === SyncErrorType.VALIDATION) {
      console.warn('[ErrorHandler] Erreur de validation:', diagnosticInfo);
    } else {
      console.info('[ErrorHandler] Erreur de synchronisation:', diagnosticInfo);
    }
  }
}
