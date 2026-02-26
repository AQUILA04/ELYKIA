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

@Injectable({
  providedIn: 'root'
})
export class RecoveryService {
  private commercialUsername: string | undefined;

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private store: Store,
    private recoveryRepository: RecoveryRepository,
    private recoveryRepositoryExtensions: RecoveryRepositoryExtensions,
    private distributionRepository: DistributionRepository
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

    return from(Network.getStatus()).pipe(
      switchMap(status => {
        if (status.connected) {
          return this.fetchRecoveriesFromApi().pipe(
            tap(async (recoveries) => {
              // Ensure commercialId is set correctly before saving
              const enrichedRecoveries = recoveries.map(r => ({
                ...r,
                // Use reference as ID if available, otherwise fallback to existing ID
                id: r.reference || r.id,
                commercialId: r.commercialId || currentCommercialId // Fallback to current user if missing
              }));
              await this.recoveryRepository.saveAll(enrichedRecoveries);
              console.log('Recoveries fetched from API and saved locally.');
            }),
            catchError(async (error) => {
              console.error('Failed to fetch recoveries from API, attempting local:', error);
              // This still loads all recoveries. Should be paginated if used in UI.
              // For initialization, it might be ok if we don't return the data.
              // The method returns Observable<Recovery[]>, so we need to return something.
              // Let's return empty and log a warning.
              console.warn('initializeRecoveries: returning empty array on API error.');
              return [];
            })
          );
        } else {
          // Same here, avoid loading all.
          console.warn('initializeRecoveries: offline, returning empty array.');
          return of([]);
        }
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
  async createRecovery(recovery: Partial<Recovery>): Promise<Recovery> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    // Génération d'un suffixe aléatoire pour éviter les collisions (sur 6 caractères hexadécimaux)
    const year = new Date().getFullYear();
    const uniqueSuffix = Math.floor(Math.random() * 0x1000000).toString(16).toUpperCase().padStart(6, '0');
    const usernameSuffix = this.commercialUsername.slice(-3); // Récupère les 3 derniers caractères

    const newId = `REC-${year}${usernameSuffix}-${uniqueSuffix}`;


    const newRecovery: Recovery = {
      id: newId,
      amount: recovery.amount || 0,
      paymentDate: recovery.paymentDate || new Date().toISOString(),
      paymentMethod: recovery.paymentMethod || 'CASH',
      notes: recovery.notes || '',
      distributionId: recovery.distributionId || '',
      clientId: recovery.clientId || '',
      commercialId: this.commercialUsername, // Set from context
      isLocal: true,
      isSync: false,
      syncDate: '',
      isDefaultStake: recovery.isDefaultStake,
      createdAt: new Date().toISOString()
    };

    // Sauvegarder localement
    await this.recoveryRepository.save(newRecovery);

    // Mettre à jour le solde de la distribution
    await this.updateDistributionBalance(newRecovery.distributionId, newRecovery.amount);

    console.log('Recovery created locally:', newRecovery);
    return newRecovery;
  }

  /**
   * Récupérer les crédits actifs d'un client
   */
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
        if (dailyPayment > 0 && amount % dailyPayment !== 0) {
          return {
            isValid: false,
            message: `Le montant doit être un multiple de ${dailyPayment} FCFA`
          };
        }

        return { isValid: true, message: 'Montant valide' };
      })
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

  /**
   * Synchroniser les recouvrements avec le serveur
   */
  async syncRecoveries(): Promise<void> {
    const localRecoveries = await this.recoveryRepository.getUnsynced();

    for (const recovery of localRecoveries) {
      try {
        // Déterminer le type de mise (normale ou spéciale)
        const distribution = await this.distributionRepository.findById(recovery.distributionId);
        const isNormalStake = distribution && recovery.amount === distribution.dailyPayment;

        if (isNormalStake) {
          await this.syncNormalStake(recovery);
        } else {
          await this.syncSpecialStake(recovery);
        }

        // Marquer comme synchronisé
        await this.recoveryRepository.markAsSynced(recovery.id);
      } catch (error) {
        console.error('Failed to sync recovery:', recovery.id, error);
      }
    }
  }

  private async syncNormalStake(recovery: Recovery): Promise<void> {
    const url = `${environment.apiUrl}/api/v1/credits/default-daily-stake`;
    const payload = {
      collector: recovery.commercialId,
      clientIds: [recovery.clientId],
      creditIds: [recovery.distributionId]
    };

    await this.http.post<ApiResponse<string[]>>(url, payload).toPromise();
  }

  private async syncSpecialStake(recovery: Recovery): Promise<void> {
    const url = `${environment.apiUrl}/api/v1/credits/special-daily-stake`;
    const payload = {
      collector: recovery.commercialId,
      stakeUnits: [{
        creditId: recovery.distributionId,
        clientId: recovery.clientId,
        amount: recovery.amount
      }]
    };

    await this.http.post<ApiResponse<string[]>>(url, payload).toPromise();
  }

  async deleteRecoveriesByDistributionIds(distributionIds: string[]): Promise<void> {
    if (!this.commercialUsername) {
      throw new Error('Commercial user not identified.');
    }
    await this.recoveryRepository.deleteByDistributionIds(distributionIds);
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
}
