import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, from, Subject } from 'rxjs';
import { takeUntil, take, filter } from 'rxjs/operators';
import { Commercial } from 'src/app/models/commercial.model';
import { selectCommercial } from 'src/app/store/commercial/commercial.selectors';
import * as AuthActions from 'src/app/store/auth/auth.actions';
import * as PreferencesActions from 'src/app/store/preferences/preferences.actions';
import { selectSyncDateFilter } from 'src/app/store/preferences/preferences.selectors';
import { Storage } from '@ionic/storage-angular';
import { selectClientKpiTotalByCommercial, selectDistributionKpiActiveByCommercial, selectCollectionRateKpi } from 'src/app/store/kpi/kpi.selectors';
import * as KpiActions from 'src/app/store/kpi/kpi.actions';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import { DatabaseService } from '../../core/services/database.service';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { SyncErrorService } from 'src/app/core/services/sync-error.service';
import { DataInitializationService } from '../../core/services/data-initialization.service';
import { MemoryManagementService, MemoryStats } from '../../core/services/memory-management.service';
import { PhotoSyncService } from '../../core/services/photo-sync.service';
import { SynchronizationService } from 'src/app/core/services/synchronization.service';
import { environment } from 'src/environments/environment';
import { SyncDateFilterOption, SYNC_DATE_FILTER_LABELS } from 'src/app/models/sync-date-filter.model';

@Component({
  selector: 'app-more',
  templateUrl: './more.page.html',
  styleUrls: ['./more.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MorePage implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  user$: Observable<Commercial | null>;
  autoSync = false;
  autoLock = false;
  autoLockDuration = 2;
  enableProfilePhotoSync = false;
  enableCardPhotoSync = false;
  totalClients$: Observable<number>;
  activeCreditsCount$: Observable<number>;
  collectionRate$: Observable<number>;
  pendingErrorsCount$!: Observable<number>;
  appVersion: string = environment.version;

  syncDateFilter: SyncDateFilterOption = 'today';
  syncDateFilterLabels = SYNC_DATE_FILTER_LABELS;

  // Propriétés pour la gestion mémoire
  memoryStats$: Observable<MemoryStats | null>;
  currentMemoryStats: MemoryStats | null = null;
  isMemoryCritical = false;

  constructor(
    private readonly store: Store,
    private readonly storage: Storage,
    private readonly databaseService: DatabaseService,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly syncErrorService: SyncErrorService,
    private readonly dataInitializationService: DataInitializationService,
    private readonly memoryManagementService: MemoryManagementService,
    private readonly photoSyncService: PhotoSyncService,
    private readonly cdr: ChangeDetectorRef,
    private readonly synchronizationService: SynchronizationService,
    private readonly router: Router
  ) {
    this.user$ = this.store.select(selectCommercial);
    this.totalClients$ = this.store.select(selectClientKpiTotalByCommercial);
    this.activeCreditsCount$ = this.store.select(selectDistributionKpiActiveByCommercial);
    this.collectionRate$ = this.store.select(selectCollectionRateKpi);
    this.memoryStats$ = this.memoryManagementService.getMemoryStats();
  }

  async ngOnInit() {
    this.autoSync = await this.storage.get('autoSync') || false;
    this.autoLock = await this.storage.get('autoLock') || false;
    this.autoLockDuration = await this.storage.get('autoLockDuration') || 2;

    // Charger les préférences de synchronisation des photos
    const photoPrefs = await this.photoSyncService.getPhotoSyncPreferences();
    this.enableProfilePhotoSync = photoPrefs.enableProfilePhotoSync;
    this.enableCardPhotoSync = photoPrefs.enableCardPhotoSync;

    // Charger la préférence de filtre de date
    this.store.select(selectSyncDateFilter).pipe(
      take(1)
    ).subscribe(filter => {
      this.syncDateFilter = filter;
    });

    // Surveiller les statistiques mémoire
    this.memoryStats$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(stats => {
      this.currentMemoryStats = stats;
      this.isMemoryCritical = this.memoryManagementService.isMemoryCritical();
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter() {
    this.loadPendingErrorsCount();
    // Refresh KPIs so profile stats are up to date
    this.store.select(selectAuthUser).pipe(
      filter(user => !!user),
      take(1)
    ).subscribe(user => {
      if (user) {
        this.store.dispatch(KpiActions.loadClientKpi({ commercialUsername: user.username }));
        this.store.dispatch(KpiActions.loadDistributionKpi({ commercialId: user.username }));
        this.store.dispatch(KpiActions.loadRecoveryKpi({ commercialId: user.username }));
      }
    });
    // Forcer la mise à jour des stats mémoire en récupérant les stats actuelles
    this.memoryManagementService.getMemoryStats().pipe(take(1)).subscribe();
    this.cdr.markForCheck();
  }

  loadPendingErrorsCount() {
    this.pendingErrorsCount$ = from(this.syncErrorService.getPendingErrorsCount());
  }

  synchronizeData() {
    // TODO: Implement data synchronization
    console.log('Synchronize data clicked');
  }

  updateLocalData() {
    // TODO: Implement local data update
    console.log('Update local data clicked');
  }

  changePassword() {
    // TODO: Implement change password
    console.log('Change password clicked');
  }

  async logout() {
    this.proceedToLogout();
  }

  private proceedToLogout() {
    this.store.dispatch(AuthActions.logout());
  }

  onSyncToggleChange() {
    this.storage.set('autoSync', this.autoSync);
  }

  onAutoLockToggleChange() {
    this.storage.set('autoLock', this.autoLock);
  }

  onAutoLockDurationChange() {
    this.storage.set('autoLockDuration', this.autoLockDuration);
  }

  async onProfilePhotoSyncToggleChange() {
    const preferences = await this.photoSyncService.getPhotoSyncPreferences();
    preferences.enableProfilePhotoSync = this.enableProfilePhotoSync;
    await this.photoSyncService.setPhotoSyncPreferences(preferences);
  }

  async onCardPhotoSyncToggleChange() {
    const preferences = await this.photoSyncService.getPhotoSyncPreferences();
    preferences.enableCardPhotoSync = this.enableCardPhotoSync;
    await this.photoSyncService.setPhotoSyncPreferences(preferences);
  }

  onSyncDateFilterChange() {
    this.store.dispatch(PreferencesActions.setSyncDateFilter({ filter: this.syncDateFilter }));
  }

  async restoreBackup() {
    const alert = await this.alertController.create({
      header: 'Confirmer la restauration',
      message: 'Voulez-vous vraiment restaurer la base de données à partir de la dernière sauvegarde ? Toutes les données non sauvegardées seront perdues.',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
        },
        {
          text: 'Restaurer',
          handler: async () => {
            const latestBackup = await this.databaseService.findLatestBackupFile();
            if (latestBackup) {
              try {
                await this.databaseService.restoreFromBackup(latestBackup);
                this.presentToast('Restauration terminée avec succès.', 'success', 'top');
              } catch (error) {
                this.presentToast('Erreur lors de la restauration.', 'danger', 'top');
                console.error('Error restoring backup:', error);
              }
            } else {
              this.presentToast('Aucune sauvegarde trouvée.', 'warning', 'top');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async backupDatabase() {
    this.dataInitializationService.backupDatabase().subscribe({
      next: () => {
        this.presentToast('Sauvegarde de la base de données terminée avec succès.', 'success', 'top');
      },
      error: (err) => {
        this.presentToast('Erreur lors de la sauvegarde de la base de données.', 'danger', 'top');
        console.error('Error backing up database:', err);
      }
    });
  }

  /**
   * Vide le cache et libère la mémoire RAM
   */
  async clearMemoryCache() {
    const alert = await this.alertController.create({
      header: 'Libérer la mémoire',
      message: 'Cette action va vider le cache et libérer la mémoire RAM pour améliorer les performances. Continuer ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Libérer',
          handler: async () => {
            await this.performMemoryCleanup();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Effectue le nettoyage mémoire
   */
  private async performMemoryCleanup() {
    const loading = await this.loadingController.create({
      message: 'Libération de la mémoire en cours...',
      spinner: 'crescent'
    });

    await loading.present();

    try {
      const result = await this.memoryManagementService.clearMemoryCache();

      await loading.dismiss();

      if (result.success) {
        await this.presentToast(result.message, 'success', 'top');

        // Afficher les détails si disponibles
        if (result.beforeStats && result.afterStats) {
          const memoryFreed = result.beforeStats.usedJSHeapSize - result.afterStats.usedJSHeapSize;
          if (memoryFreed > 0) {
            const detailAlert = await this.alertController.create({
              header: 'Mémoire libérée',
              message: `
                <p><strong>Avant :</strong> ${result.beforeStats.formattedUsed}</p>
                <p><strong>Après :</strong> ${result.afterStats.formattedUsed}</p>
                <p><strong>Libéré :</strong> ${this.formatBytes(memoryFreed)}</p>
              `,
              buttons: ['OK']
            });
            await detailAlert.present();
          }
        }
      } else {
        await this.presentToast(result.message, 'danger', 'top');
      }
    } catch (error) {
      await loading.dismiss();
      await this.presentToast('Erreur lors de la libération de la mémoire', 'danger', 'top');
      console.error('Memory cleanup error:', error);
    }
  }

  /**
   * Obtient la couleur d'alerte selon l'utilisation mémoire
   */
  getMemoryAlertColor(): string {
    const level = this.memoryManagementService.getMemoryAlertLevel();
    switch (level) {
      case 'low': return 'success';
      case 'medium': return 'primary';
      case 'high': return 'warning';
      case 'critical': return 'danger';
      default: return 'medium';
    }
  }

  /**
   * Obtient le texte d'état mémoire
   */
  getMemoryStatusText(): string {
    if (!this.currentMemoryStats) return 'Calcul en cours...';

    const level = this.memoryManagementService.getMemoryAlertLevel();
    const percentage = this.currentMemoryStats.usedPercentage;

    switch (level) {
      case 'low': return `Optimal (${percentage}%)`;
      case 'medium': return `Correct (${percentage}%)`;
      case 'high': return `Élevé (${percentage}%)`;
      case 'critical': return `Critique (${percentage}%)`;
      default: return `${percentage}%`;
    }
  }

  /**
   * Formate les bytes
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async presentToast(message: string, color: string, position?: 'top' | 'bottom' | 'middle') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position
    });
    toast.present();
  }

  openUserGuide() {
    window.location.href = '/user-guide/commercial/index.html';
  }

  async repairServerPhotos() {
    const alert = await this.alertController.create({
      header: 'Réparer les photos serveur',
      message: 'Cette action va vérifier les photos manquantes sur le serveur et tenter de les renvoyer depuis votre téléphone. Cela peut prendre du temps et consommer de la data.',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Démarrer',
          handler: async () => {
            await this.performPhotoRepair();
          }
        }
      ]
    });

    await alert.present();
  }

  private async performPhotoRepair() {
    const loading = await this.loadingController.create({
      message: 'Démarrage de la réparation...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.photoSyncService.repairServerPhotos((msg) => {
        loading.message = msg;
      });

      await loading.dismiss();
      await this.presentToast('Réparation des photos terminée.', 'success', 'top');
    } catch (error) {
      await loading.dismiss();
      await this.presentToast('Erreur lors de la réparation des photos.', 'danger', 'top');
      console.error('Photo repair error:', error);
    }
  }
}
