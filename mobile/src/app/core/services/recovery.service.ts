import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Network } from '@capacitor/network';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { Recovery } from '../../models/recovery.model';
import { Distribution } from '../../models/distribution.model';
import { ApiResponse } from '../../models/api-response.model';
import { Store } from '@ngrx/store';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { RecoveryRepository } from '../repositories/recovery.repository';
import { RecoveryRepositoryExtensions, RecoveryRepositoryFilters } from '../repositories/recovery.repository.extensions';
import { DistributionRepository } from '../repositories/distribution.repository';
import { LoggerService } from "./logger.service";
import { HealthCheckService } from "./health-check.service";
import { ReliquatService } from './reliquat.service';
import { DailyConsentGuardService } from '../../features/daily-consent/daily-consent-guard.service';
import { DailyConsentStateService } from '../daily-consent/daily-consent-state.service';
import { AmountConfirmationService } from '../../features/amount-confirmation/amount-confirmation.service';
import { RecoverySyncService } from './sync/recovery-sync.service';
import { OnlineFirstWriteCoordinator } from './online-first-write.coordinator';

export class RecoveryCreationInFlightError extends Error {
  constructor(message = 'Un recouvrement est déjà en cours de création.') {
    super(message);
    this.name = 'RecoveryCreationInFlightError';
  }
}

@Injectable({
  providedIn: 'root'
})
export class RecoveryService {
  private commercialUsername: string | undefined;
  private recoveryCreationInFlight = false;
  private recoveryCreationStartedAt: number | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly dbService: DatabaseService,
    private readonly store: Store,
    private readonly recoveryRepository: RecoveryRepository,
    private readonly recoveryRepositoryExtensions: RecoveryRepositoryExtensions,
    private readonly distributionRepository: DistributionRepository,
    private readonly log: LoggerService,
    private readonly healthCheckService: HealthCheckService,
    private readonly reliquatService: ReliquatService,
    private readonly dailyConsentGuard: DailyConsentGuardService,
    private readonly dailyConsentState: DailyConsentStateService,
    private readonly amountConfirmation: AmountConfirmationService,
    private readonly recoverySyncService: RecoverySyncService,
    private readonly onlineFirstWriteCoordinator: OnlineFirstWriteCoordinator
  ) {
    this.store.select(selectAuthUser).subscribe(user => {
      this.commercialUsername = user?.username;
    });
  }

  initializeRecoveries(): Observable<Recovery[]> {
    if (!this.commercialUsername) {
      console.error('Recovery service: Commercial username not available for initialization.');
      return of([]);
    }
    const currentCommercialId = this.commercialUsername;

    return this.healthCheckService.pingBackend().pipe(
      switchMap(isOnline => {
        if (isOnline) {
          return this.fetchRecoveriesFromApi().pipe(
            tap(async (recoveries) => {
              // Supprimer d'abord tous les recouvrements déjà synchronisés en local.
              // Cela évite les doublons causés par le décalage entre l'ID mobile (ex: "REC-A")
              // et l'ID numérique backend (ex: "42") renvoyé lors de la réinitialisation.
              // Les recouvrements non synchronisés (isSync = 0) sont conservés.
              await this.recoveryRepository.deleteSynced(currentCommercialId);

              const enrichedRecoveries = recoveries.map(r => ({
                ...r,
                // Utiliser la référence comme ID si disponible (= ID mobile original),
                // sinon fallback sur l'ID numérique backend.
                id: r.reference || r.id,
                commercialId: r.commercialId || currentCommercialId
              }));
              await this.recoveryRepository.saveAll(enrichedRecoveries);
              console.log('Recoveries fetched from API and saved locally.');
            }),
            catchError(async (error) => {
              console.error('Failed to fetch recoveries from API, attempting local:', error);
              console.warn('initializeRecoveries: returning empty array on API error.');
              return [];
            })
          );
        } else {
          console.warn('initializeRecoveries: offline, returning empty array.');
          return of([]);
        }
      }),
      catchError(err => {
        console.error('Recoveries initialization failed:', err);
        return of([]);
      })
    );
  }

  private fetchRecoveriesFromApi(): Observable<Recovery[]> {
    if (!this.commercialUsername) {
      console.error('Recovery service: Commercial username not available for API fetch.');
      return of([]);
    }
    // Utiliser le nouvel endpoint qui récupère les CreditTimeline des 30 derniers jours
    const url = `${environment.apiUrl}/api/v1/mobiles/credit-timelines/${this.commercialUsername}`;
    return this.http.get<ApiResponse<Recovery[]>>(url).pipe(
      map(response => {
        console.log(`[RecoveryService] Récupéré ${response.data.length} recouvrements depuis le serveur`);
        return response.data;
      })
    );
  }

  async getRecoveries(): Promise<Recovery[]> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    console.warn('getRecoveries is deprecated. Use getRecoveriesPaginated instead.');
    return [];
  }

  getRecoveriesByCommercialUsername(username: string): Observable<Recovery[]> {
    console.warn('getRecoveriesByCommercialUsername is deprecated. Use getRecoveriesPaginated instead.');
    return of([]);
  }

  // Nouvelles méthodes pour l'US008

  /**
   * Créer un nouveau recouvrement
   */
  async createRecovery(
    recovery: Partial<Recovery>,
    keepReliquat: boolean = true,
    forceOffline = false
  ): Promise<Recovery> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }

    if (this.recoveryCreationInFlight) {
      const elapsedMs = this.recoveryCreationStartedAt ? Date.now() - this.recoveryCreationStartedAt : 0;
      void this.log.log(
        `[RecoveryService][BLOCKED_DUPLICATE] client=${recovery.clientId} distribution=${recovery.distributionId} ` +
        `amount=${recovery.amount} inFlightSinceMs=${elapsedMs}`
      );
      throw new RecoveryCreationInFlightError();
    }

    this.recoveryCreationInFlight = true;
    this.recoveryCreationStartedAt = Date.now();
    const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    void this.log.log(
      `[RecoveryService][CREATE_START][${traceId}] client=${recovery.clientId} distribution=${recovery.distributionId} ` +
      `amount=${recovery.amount} isDefaultStake=${recovery.isDefaultStake} paymentDate=${recovery.paymentDate}`
    );

    try {
      // Consentement journalier
      await this.dailyConsentGuard.requireDailyConsent();
      void this.log.log(`[RecoveryService][CREATE_STEP][${traceId}] dailyConsent=ok`);

      // Génération d'un suffixe aléatoire pour éviter les collisions (sur 6 caractères hexadécimaux)
      const year = new Date().getFullYear();
      const uniqueSuffix = Math.floor(Math.random() * 0x1000000).toString(16).toUpperCase().padStart(6, '0');
      const usernameSuffix = this.commercialUsername.slice(-3);

      const newId = `REC-${year}${usernameSuffix}-${uniqueSuffix}`;

      const newRecovery: Recovery = {
        id: newId,
        amount: recovery.amount || 0,
        paymentDate: recovery.paymentDate || new Date().toISOString(),
        paymentMethod: recovery.paymentMethod || 'CASH',
        notes: recovery.notes || '',
        distributionId: recovery.distributionId || '',
        clientId: recovery.clientId || '',
        commercialId: this.commercialUsername,
        isLocal: true,
        isSync: false,
        syncDate: '',
        isDefaultStake: recovery.isDefaultStake,
        createdAt: new Date().toISOString(),
        reliquatGeneratedAmount: recovery.reliquatGeneratedAmount || 0,
        reliquatUsedAmount: recovery.reliquatUsedAmount || 0
      };

      void this.log.log(`[RecoveryService][CREATE_STEP][${traceId}] recoveryId=${newId} awaitingAmountConfirmation`);

      // Confirmation du montant
      const confirmedAmount = await this.amountConfirmation.confirmAmount(newRecovery.amount);
      newRecovery.confirmedAmount = confirmedAmount;
      newRecovery.operationConsentCode = this.dailyConsentState.getActiveConsentCode() ?? undefined;

      void this.log.log(
        `[RecoveryService][CREATE_STEP][${traceId}] amountConfirmed=${confirmedAmount} persisting`
      );

      const writeResult = await this.onlineFirstWriteCoordinator.executeWrite({
        entityLabel: 'recovery',
        forceOffline,
        saveOffline: () => this.persistRecovery(newRecovery, keepReliquat, false),
        saveOnline: () => this.persistRecovery(newRecovery, keepReliquat, true)
      });

      const savedRecovery = writeResult.data;

      void this.log.log(
        `[RecoveryService][CREATE_DONE][${traceId}] recoveryId=${savedRecovery.id} mode=${writeResult.mode} amount=${savedRecovery.amount} ` +
        `paymentDate=${savedRecovery.paymentDate} client=${savedRecovery.clientId}`
      );
      return savedRecovery;
    } catch (error) {
      void this.log.error(`[RecoveryService][CREATE_FAILED][${traceId}]`, error);
      throw error;
    } finally {
      this.recoveryCreationInFlight = false;
      this.recoveryCreationStartedAt = null;
    }
  }

  private async persistRecovery(
    newRecovery: Recovery,
    keepReliquat: boolean,
    online: boolean
  ): Promise<Recovery> {
    if (online) {
      await this.recoverySyncService.postCreateRecovery(newRecovery);
    }

    const persistedRecovery: Recovery = {
      ...newRecovery,
      isLocal: !online,
      isSync: online,
      syncDate: online ? new Date().toISOString() : ''
    };

    await this.recoveryRepository.save(persistedRecovery);
    await this.applyReliquatChanges(persistedRecovery, keepReliquat, online);
    await this.updateDistributionBalance(persistedRecovery.distributionId, persistedRecovery.amount);
    return persistedRecovery;
  }

  private async applyReliquatChanges(
    recovery: Recovery,
    keepReliquat: boolean,
    markSynced: boolean
  ): Promise<void> {
    if (!this.commercialUsername) {
      return;
    }

    if (keepReliquat && recovery.reliquatGeneratedAmount && recovery.reliquatGeneratedAmount > 0) {
      await this.reliquatService.addReliquat(
        recovery.clientId,
        this.commercialUsername,
        recovery.reliquatGeneratedAmount,
        recovery.id,
        markSynced
      );
    }
    if (recovery.reliquatUsedAmount && recovery.reliquatUsedAmount > 0) {
      await this.reliquatService.consumeReliquat(recovery.clientId, recovery.reliquatUsedAmount, markSynced);
    }
  }

  async getClientActiveCredits(clientId: string): Promise<Distribution[]> {
    return await this.distributionRepository.getActiveByClientId(clientId);
  }

  /**
   * Valider le montant d'un recouvrement
   */
  validateRecoveryAmount(amount: number, distributionId: string): Observable<{ isValid: boolean, message: string }> {
    return from(this.distributionRepository.findById(distributionId)).pipe(
      map(distribution => {
        if (!distribution) {
          return { isValid: false, message: 'Distribution non trouvée' };
        }

        const remainingAmount = distribution.remainingAmount || 0;
        const dailyPayment = distribution.dailyPayment || 0;

        // Vérifier que le montant ne dépasse pas le solde restant
        if (amount > remainingAmount) {
          return {
            isValid: false,
            message: `Le montant ne peut pas dépasser ${remainingAmount} FCFA`
          };
        }

        // Vérifier que le montant est un multiple de la mise journalière
        // if (dailyPayment > 0 && amount % dailyPayment !== 0) {
        //   return {
        //     isValid: false,
        //     message: `Le montant doit être un multiple de ${dailyPayment} FCFA`
        //   };
        // }

        return { isValid: true, message: 'Montant valide' };
      })
    );
  }

  async deleteRecoveriesByDistributionIds(distributionIds: string[]): Promise<void> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    await this.recoveryRepository.deleteByDistributionIds(distributionIds);
  }

  /**
   * Supprime un recouvrement local non synchronisé et reverse ses effets
   * (solde distribution + reliquats).
   */
  async deleteLocalUnsyncedRecovery(recoveryId: string): Promise<void> {
    const recovery = await this.recoveryRepository.findById(recoveryId);
    if (!recovery) {
      throw new Error('Recouvrement introuvable.');
    }

    const isSynced = recovery.isSync === true || (recovery as any).isSync === 1;
    const isLocal = recovery.isLocal === true || (recovery as any).isLocal === 1;
    if (isSynced || !isLocal) {
      throw new Error('Seuls les recouvrements locaux non synchronisés peuvent être supprimés.');
    }

    const amount = recovery.amount || 0;
    const generated = recovery.reliquatGeneratedAmount || 0;
    const used = recovery.reliquatUsedAmount || 0;

    await this.reverseDistributionBalance(recovery.distributionId, amount);

    if (generated > 0 && recovery.clientId) {
      const current = await this.reliquatService.getReliquatForClient(recovery.clientId);
      const toReverse = Math.min(generated, current?.totalAmount || 0);
      if (toReverse > 0) {
        await this.reliquatService.consumeReliquat(recovery.clientId, toReverse);
      }
    }
    if (used > 0 && recovery.clientId && this.commercialUsername) {
      await this.reliquatService.addReliquat(
        recovery.clientId,
        this.commercialUsername,
        used,
        recovery.id
      );
    }

    await this.recoveryRepository.delete(recoveryId);
    void this.log.log(
      `[RecoveryService][DELETE_LOCAL] recoveryId=${recoveryId} amount=${amount} distribution=${recovery.distributionId}`
    );
  }

  /**
   * Mettre à jour le solde d'une distribution après un recouvrement
   */
  private async updateDistributionBalance(distributionId: string, recoveryAmount: number): Promise<void> {
    const distribution = await this.distributionRepository.findById(distributionId);
    if (distribution) {
      const updatedDistribution = {
        ...distribution,
        remainingAmount: (distribution.remainingAmount || 0) - recoveryAmount,
        paidAmount: (distribution.paidAmount || 0) + recoveryAmount
      };
      await this.distributionRepository.updateDistribution(updatedDistribution);
    }
  }

  private async reverseDistributionBalance(distributionId: string, recoveryAmount: number): Promise<void> {
    const distribution = await this.distributionRepository.findById(distributionId);
    if (!distribution) {
      return;
    }

    const paidAmount = Math.max(0, (distribution.paidAmount || 0) - recoveryAmount);
    const remainingAmount = (distribution.remainingAmount || 0) + recoveryAmount;
    const updatedDistribution = {
      ...distribution,
      paidAmount,
      remainingAmount,
      status: remainingAmount > 0 ? 'INPROGRESS' : distribution.status
    };
    await this.distributionRepository.updateDistribution(updatedDistribution as any);
  }

  // ==================== PAGINATION METHODS ====================

  /**
   * Get paginated recoveries from local database
   *
   * **SECURITY**: This method requires commercialId for data isolation
   *
   * @param commercialId ID of the commercial (REQUIRED)
   * @param page Page number (zero-indexed)
   * @param size Number of items per page
   * @param filters Optional filters
   * @returns Page of recoveries
   */
  async getRecoveriesPaginated(
    commercialId: string,
    page: number,
    size: number,
    filters?: RecoveryRepositoryFilters
  ): Promise<{ content: Recovery[]; totalElements: number; totalPages: number; page: number; size: number }> {
    if (!commercialId) {
      throw new Error('commercialId is required for security');
    }

    return this.recoveryRepositoryExtensions.findByCommercialPaginated(commercialId, page, size, filters);
  }

  /**
   * Check if a recovery already exists for a client on a specific date
   * @param clientId Client ID
   * @param date Date string (YYYY-MM-DD)
   * @returns True if a recovery exists, false otherwise
   */
  async checkExistingRecoveryForToday(clientId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const count = await this.recoveryRepository.countByClientAndDate(clientId, today);
    void this.log.log(
      `[RecoveryService][CHECK_TODAY] client=${clientId} date=${today} existingCount=${count}`
    );
    return count > 0;
  }
}
