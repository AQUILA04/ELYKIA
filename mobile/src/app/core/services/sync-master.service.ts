import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';
import { SyncErrorService } from './sync-error.service';
import { updateSyncProgress } from '../../store/sync/sync.actions';

// Domain Specific Services
import { LocalitySyncService } from './sync/locality-sync.service';
import { ClientSyncService } from './sync/client-sync.service';
import { AccountSyncService } from './sync/account-sync.service';
import { OrderSyncService } from './sync/order-sync.service';
import { DistributionSyncService } from './sync/distribution-sync.service';
import { RecoverySyncService } from './sync/recovery-sync.service';
import { TontineMemberSyncService } from './sync/tontine-member-sync.service';
import { TontineCollectionSyncService } from './sync/tontine-collection-sync.service';
import { TontineDeliverySyncService } from './sync/tontine-delivery-sync.service';
import { CashDeskService } from './cash-desk.service';

import {
  SyncResult,
  SyncBatchResult
} from '../../models/sync.model';

import {
  ApiResponse,
  CashDeskStatusResponse
} from '../../models/api-sync-response.model';

@Injectable({
  providedIn: 'root'
})
export class SyncMasterService {
  private baseUrl = environment.apiUrl;

  // State for dependency management
  private failedClientIds: string[] = [];
  private failedDistributionIds: string[] = [];
  private failedTontineMemberIds: string[] = [];

  constructor(
    private http: HttpClient,
    private store: Store,
    private authService: AuthService,
    private databaseService: DatabaseService,
    private syncErrorService: SyncErrorService,
    private cashDeskService: CashDeskService,
    // Domain Services
    private localitySyncService: LocalitySyncService,
    private clientSyncService: ClientSyncService,
    private accountSyncService: AccountSyncService,
    private orderSyncService: OrderSyncService,
    private distributionSyncService: DistributionSyncService,
    private recoverySyncService: RecoverySyncService,
    private tontineMemberSyncService: TontineMemberSyncService,
    private tontineCollectionSyncService: TontineCollectionSyncService,
    private tontineDeliverySyncService: TontineDeliverySyncService
  ) { }

  /**
   * Orchestrates the complete synchronization process.
   * Replaces SynchronizationService.synchronizeAllData
   */
  async synchronizeAllData(): Promise<SyncResult> {
    const startTime = Date.now();
    this.resetState();

    // Initialize Result Object
    const batchResult: SyncBatchResult = {
      localitiesSync: { success: 0, errors: 0 },
      clientsSync: { success: 0, errors: 0 },
      updatedClientsSync: { success: 0, errors: 0 }, // Included in clientsSync in new arch, but kept for structure
      updatedPhotoClientsSync: { success: 0, errors: 0 }, // Included in clientsSync
      updatedPhotoUrlClientsSync: { success: 0, errors: 0 }, // Included in clientsSync
      distributionsSync: { success: 0, errors: 0 },
      recoveriesSync: { success: 0, errors: 0 },
      accountsSync: { success: 0, errors: 0 },
      ordersSync: { success: 0, errors: 0 },
      tontineMembersSync: { success: 0, errors: 0 },
      tontineCollectionsSync: { success: 0, errors: 0 },
      tontineDeliveriesSync: { success: 0, errors: 0 },
    };

    try {
      // 1. Calculate Total Items for Progress
      const totalItems = await this.calculateTotalItems();
      let processedItems = 0;
      // Removed invalid 'starting' phase
      this.store.dispatch(updateSyncProgress({ progress: { totalItems, processedItems, percentage: 0 } }));

      // 2. Check and Open Cash Desk (Pre-requisite)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'cash-check' } }));
      await this.cashDeskService.checkAndOpenCashDesk();

      // 3. Sync Localities
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'localities' } }));
      const locResult = await this.localitySyncService.syncAll();
      batchResult.localitiesSync = { success: locResult.success, errors: locResult.errors };
      processedItems += (locResult.success + locResult.errors);
      this.updateProgress(processedItems, totalItems);

      // 4. Sync Clients (Includes Create, Update, Photos, Locations)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'clients' } }));
      const clientResult = await this.clientSyncService.syncAll();
      batchResult.clientsSync = { success: clientResult.success, errors: clientResult.errors };
      this.failedClientIds = clientResult.failedIds; // Capture failed IDs for dependencies
      processedItems += (clientResult.success + clientResult.errors);
      this.updateProgress(processedItems, totalItems);

      // 5. Sync Accounts
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'accounts' } }));
      const accountResult = await this.accountSyncService.syncAll();
      batchResult.accountsSync = { success: accountResult.success, errors: accountResult.errors };
      processedItems += (accountResult.success + accountResult.errors);
      this.updateProgress(processedItems, totalItems);

      // 6. Sync Orders (Depends on Clients)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'orders' } }));
      this.orderSyncService.setFailedClientIds(this.failedClientIds);
      const orderResult = await this.orderSyncService.syncAll();
      batchResult.ordersSync = { success: orderResult.success, errors: orderResult.errors };
      processedItems += (orderResult.success + orderResult.errors);
      this.updateProgress(processedItems, totalItems);

      // 7. Sync Distributions (Depends on Clients)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'distributions' } }));
      this.distributionSyncService.setFailedClientIds(this.failedClientIds);
      const distResult = await this.distributionSyncService.syncAll();
      batchResult.distributionsSync = { success: distResult.success, errors: distResult.errors };
      this.failedDistributionIds = distResult.failedIds; // Capture failed IDs for Recoveries
      processedItems += (distResult.success + distResult.errors);
      this.updateProgress(processedItems, totalItems);

      // 8. Sync Recoveries (Depends on Clients AND Distributions)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'recoveries' } }));
      this.recoverySyncService.setFailedClientIds(this.failedClientIds);
      this.recoverySyncService.setFailedDistributionIds(this.failedDistributionIds);
      const recResult = await this.recoverySyncService.syncAll();
      batchResult.recoveriesSync = { success: recResult.success, errors: recResult.errors };
      processedItems += (recResult.success + recResult.errors);
      this.updateProgress(processedItems, totalItems);

      // 9. Sync Tontine Members (Depends on Clients)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'tontine-members' } }));
      // Assuming TontineMemberSyncService has setFailedClientIds (if not, it needs to be added)
      // For now, we assume the pattern holds. If the method is missing in the service, it should be added.
      if (typeof (this.tontineMemberSyncService as any).setFailedClientIds === 'function') {
        (this.tontineMemberSyncService as any).setFailedClientIds(this.failedClientIds);
      }
      const tmResult = await this.tontineMemberSyncService.syncAll();
      batchResult.tontineMembersSync = { success: tmResult.success, errors: tmResult.errors };
      this.failedTontineMemberIds = tmResult.failedIds;
      processedItems += (tmResult.success + tmResult.errors);
      this.updateProgress(processedItems, totalItems);

      // 10. Sync Tontine Collections (Depends on Tontine Members)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'tontine-collections' } }));
      this.tontineCollectionSyncService.setFailedMemberIds(this.failedTontineMemberIds);
      const tcResult = await this.tontineCollectionSyncService.syncAll();
      batchResult.tontineCollectionsSync = { success: tcResult.success, errors: tcResult.errors };
      processedItems += (tcResult.success + tcResult.errors);
      this.updateProgress(processedItems, totalItems);

      // 11. Sync Tontine Deliveries (Depends on Tontine Members)
      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'tontine-deliveries' } }));
      this.tontineDeliverySyncService.setFailedMemberIds(this.failedTontineMemberIds);
      const tdResult = await this.tontineDeliverySyncService.syncAll();
      batchResult.tontineDeliveriesSync = { success: tdResult.success, errors: tdResult.errors };
      processedItems += (tdResult.success + tdResult.errors);
      this.updateProgress(processedItems, totalItems);

      this.store.dispatch(updateSyncProgress({ progress: { currentPhase: 'completed', percentage: 100 } }));

      // Final Report
      const duration = Date.now() - startTime;
      const totalSuccess = this.sumSuccess(batchResult);
      const totalErrors = this.sumErrors(batchResult);

      return {
        success: totalErrors === 0,
        totalProcessed: totalSuccess + totalErrors,
        successCount: totalSuccess,
        errorCount: totalErrors,
        errors: await this.syncErrorService.getSyncErrors(),
        duration
      };

    } catch (error) {
      console.error('Erreur critique lors de l\'orchestration de la synchronisation:', error);
      throw error;
    }
  }

  // ==================== HELPERS ====================

  private resetState() {
    this.failedClientIds = [];
    this.failedDistributionIds = [];
    this.failedTontineMemberIds = [];
  }

  private updateProgress(processed: number, total: number) {
    const percentage = total > 0 ? (processed / total) * 100 : 0;
    this.store.dispatch(updateSyncProgress({ progress: { processedItems: processed, percentage } }));
  }

  private async calculateTotalItems(): Promise<number> {
    const counts = await Promise.all([
      this.localitySyncService.getUnsyncedCount(),
      this.clientSyncService.getUnsyncedCount(),
      this.clientSyncService.getUpdatedCount(), // Includes updated clients
      // Note: Photos/Urls/Locations counts might need specific methods if not covered by getUpdatedCount
      this.accountSyncService.getUnsyncedCount(),
      this.accountSyncService.getUpdatedCount(),
      this.orderSyncService.getUnsyncedCount(),
      this.distributionSyncService.getUnsyncedCount(),
      this.recoverySyncService.getUnsyncedCount(),
      this.tontineMemberSyncService.getUnsyncedCount(),
      this.tontineMemberSyncService.getUpdatedCount(),
      this.tontineCollectionSyncService.getUnsyncedCount(),
      this.tontineDeliverySyncService.getUnsyncedCount()
    ]);

    return counts.reduce((sum, count) => sum + count, 0);
  }

  private sumSuccess(result: SyncBatchResult): number {
    return Object.values(result).reduce((sum, val) => sum + (val.success || 0), 0);
  }

  private sumErrors(result: SyncBatchResult): number {
    return Object.values(result).reduce((sum, val) => sum + (val.errors || 0), 0);
  }
}
