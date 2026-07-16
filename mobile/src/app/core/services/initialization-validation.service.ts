import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { DatabaseService } from './database.service';
import { DataSummary, DataComparisonResult } from '../../models/data-summary.model';
import { ApiResponse } from '../../models/api-response.model';
import { Storage } from '@ionic/storage-angular';

/**
 * Service pour valider la complétude de l'initialisation des données
 * Vérifie que les totaux locaux correspondent aux totaux serveur
 */
@Injectable({
  providedIn: 'root'
})
export class InitializationValidationService {

  private readonly INIT_DATE_KEY = 'last_complete_initialization_date';
  private readonly TOLERANCE_PERCENTAGE = 0.05; // 5% de tolérance
  /** Sous-effectif clients : tolérance plus stricte (1 %) pour détecter une init clients ratée. */
  private readonly CLIENT_UNDER_TOLERANCE_PERCENTAGE = 0.01;

  constructor(
    private http: HttpClient,
    private dbService: DatabaseService,
    private storage: Storage
  ) {}

  /**
   * Récupère le résumé des données depuis le serveur
   */
  fetchServerSummary(commercialUsername: string): Observable<DataSummary> {
    const url = `${environment.apiUrl}/api/v1/mobiles/data-summary/${commercialUsername}`;
    return this.http.get<ApiResponse<DataSummary>>(url).pipe(
      map(response => response.data)
    );
  }

  /**
   * Compare les totaux serveur avec les totaux locaux
   */
  async compareData(commercialUsername: string, serverSummary: DataSummary): Promise<DataComparisonResult> {
    console.log('[InitializationValidation] Comparing server vs local data...');

    // Récupérer les totaux locaux
    const localCounts = {
      clients: await this.dbService.countClients(commercialUsername),
      distributions: await this.dbService.countDistributions(commercialUsername),
      recoveries: await this.dbService.countRecoveries(commercialUsername, 30), // 30 derniers jours
      tontineMembers: await this.dbService.countTontineMembers(commercialUsername),
      tontineCollections: await this.dbService.countTontineCollections(commercialUsername, 30),
      tontineDeliveries: await this.dbService.countTontineDeliveries(commercialUsername, 30),
      articles: await this.dbService.countArticles(),
      localities: await this.dbService.countLocalities(),
      tontineStockItems: await this.dbService.countTontineStockItems(commercialUsername),
      tontineStockAvailable: await this.dbService.countTontineStockAvailable(commercialUsername),
      commercialStockItems: await this.dbService.countCommercialStockItems(commercialUsername),
      commercialStockRemaining: await this.dbService.countCommercialStockRemaining(commercialUsername)
    };


    // Comparer les totaux
    const missingData: string[] = [];
    let clientsMismatch = false;

    const clientComparison = this.compareClientCounts(localCounts.clients, serverSummary.totalClients);
    if (!clientComparison.acceptable) {
      if (clientComparison.blocking) {
        clientsMismatch = true;
      }
      missingData.push(`Clients (local: ${localCounts.clients}, serveur: ${serverSummary.totalClients})`);
    }

    if (!this.isWithinTolerance(localCounts.distributions, serverSummary.totalDistributions)) {
      missingData.push(`Distributions (local: ${localCounts.distributions}, serveur: ${serverSummary.totalDistributions})`);
    }

    if (!this.isWithinTolerance(localCounts.recoveries, serverSummary.totalRecoveries)) {
      missingData.push(`Recouvrements (local: ${localCounts.recoveries}, serveur: ${serverSummary.totalRecoveries})`);
    }

    if (!this.isWithinTolerance(localCounts.tontineMembers, serverSummary.totalTontineMembers)) {
      missingData.push(`Membres Tontine (local: ${localCounts.tontineMembers}, serveur: ${serverSummary.totalTontineMembers})`);
    }

    if (!this.isWithinTolerance(localCounts.articles, serverSummary.totalArticles)) {
      missingData.push(`Articles (local: ${localCounts.articles}, serveur: ${serverSummary.totalArticles})`);
    }

    if (!this.isWithinTolerance(localCounts.localities, serverSummary.totalLocalities)) {
      missingData.push(`Localités (local: ${localCounts.localities}, serveur: ${serverSummary.totalLocalities})`);
    }

    if (!this.isWithinTolerance(localCounts.tontineStockItems, serverSummary.totalTontineStockItems)) {
      missingData.push(`Items Stock Tontine (local: ${localCounts.tontineStockItems}, serveur: ${serverSummary.totalTontineStockItems})`);
    }

    if (!this.isWithinTolerance(localCounts.tontineStockAvailable, serverSummary.totalTontineStockAvailable)) {
      missingData.push(`Quantité Stock Tontine (local: ${localCounts.tontineStockAvailable}, serveur: ${serverSummary.totalTontineStockAvailable})`);
    }

    if (!this.isWithinTolerance(localCounts.commercialStockItems, serverSummary.totalCommercialStockItems)) {
      missingData.push(`Items Stock Commercial (local: ${localCounts.commercialStockItems}, serveur: ${serverSummary.totalCommercialStockItems})`);
    }

    if (!this.isWithinTolerance(localCounts.commercialStockRemaining, serverSummary.totalCommercialStockRemaining)) {
      missingData.push(`Quantité Stock Commercial (local: ${localCounts.commercialStockRemaining}, serveur: ${serverSummary.totalCommercialStockRemaining})`);
    }

    const isComplete = missingData.length === 0;

    console.log('[InitializationValidation] Local counts:', JSON.stringify(localCounts));
    console.log('[InitializationValidation] Server summary clients/distributions:',
      serverSummary.totalClients, serverSummary.totalDistributions);

    if (isComplete) {
      console.log('[InitializationValidation] ✅ Data is complete and matches server');
    } else {
      console.warn('[InitializationValidation] ⚠️ Data is incomplete:', missingData);
      if (clientsMismatch) {
        console.error('[InitializationValidation] ❌ CRITICAL: client count mismatch — initialization must not be marked complete');
      }
    }

    return {
      isComplete,
      missingData,
      serverSummary,
      localCounts,
      clientsMismatch
    };
  }

  /**
   * Vérifie si deux valeurs sont dans la tolérance acceptable
   */
  private isWithinTolerance(local: number, server: number, tolerancePercentage: number = this.TOLERANCE_PERCENTAGE): boolean {
    if (server === 0) {
      return local === 0;
    }
    const difference = Math.abs(local - server);
    const tolerance = server * tolerancePercentage;
    return difference <= tolerance;
  }

  /**
   * Clients :
   * - blocage uniquement si le serveur a plus de clients que le mobile ;
   * - simple warning si le mobile en a plus que le serveur.
   */
  private compareClientCounts(local: number, server: number): { acceptable: boolean; blocking: boolean } {
    if (server === 0) {
      return { acceptable: true, blocking: false };
    }
    if (local === 0) {
      return { acceptable: false, blocking: true };
    }
    if (local < server) {
      const missing = server - local;
      const underTolerance = Math.max(1, server * this.CLIENT_UNDER_TOLERANCE_PERCENTAGE);
      const acceptable = missing <= underTolerance;
      return { acceptable, blocking: !acceptable };
    }

    const acceptable = this.isWithinTolerance(local, server, this.TOLERANCE_PERCENTAGE);
    return { acceptable, blocking: false };
  }

  /**
   * Vérifie si l'initialisation est complète pour la journée courante
   */
  async isInitializationCompleteForToday(): Promise<boolean> {
    const lastInitDate = await this.storage.get(this.INIT_DATE_KEY);

    if (!lastInitDate) {
      console.log('[InitializationValidation] No initialization date found');
      return false;
    }

    const lastInit = new Date(lastInitDate);
    const today = new Date();

    // Vérifier si c'est le même jour
    const isSameDay = lastInit.getDate() === today.getDate() &&
                      lastInit.getMonth() === today.getMonth() &&
                      lastInit.getFullYear() === today.getFullYear();

    console.log('[InitializationValidation] Last init:', lastInit, 'Today:', today, 'Same day:', isSameDay);

    return isSameDay;
  }

  /**
   * Marque l'initialisation comme complète pour aujourd'hui
   */
  async markInitializationComplete(): Promise<void> {
    const now = new Date().toISOString();
    await this.storage.set(this.INIT_DATE_KEY, now);
    console.log('[InitializationValidation] Initialization marked as complete for today:', now);
  }

  /**
   * Réinitialise l'état d'initialisation
   */
  async resetInitializationState(): Promise<void> {
    await this.storage.remove(this.INIT_DATE_KEY);
    console.log('[InitializationValidation] Initialization state reset');
  }

  /**
   * Valide l'initialisation complète (récupère le résumé serveur et compare)
   */
  validateInitialization(commercialUsername: string): Observable<DataComparisonResult> {
    return this.fetchServerSummary(commercialUsername).pipe(
      switchMap(serverSummary => from(this.compareData(commercialUsername, serverSummary)))
    );
  }
}
