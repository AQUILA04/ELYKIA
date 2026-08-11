import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, from, Subject, firstValueFrom } from 'rxjs';
import { takeUntil, take, filter, switchMap } from 'rxjs/operators';
import { Commercial } from 'src/app/models/commercial.model';
import { selectCommercialByUsername } from 'src/app/store/commercial/commercial.selectors';
import * as AuthActions from 'src/app/store/auth/auth.actions';
import * as PreferencesActions from 'src/app/store/preferences/preferences.actions';
import { selectSyncDateFilter } from 'src/app/store/preferences/preferences.selectors';
import { Storage } from '@ionic/storage-angular';
import { selectClientKpiTotalByCommercial, selectDistributionKpiActiveByCommercial, selectCollectionRateKpi } from 'src/app/store/kpi/kpi.selectors';
import * as KpiActions from 'src/app/store/kpi/kpi.actions';
import { selectAuthUser } from 'src/app/store/auth/auth.selectors';
import * as CommercialActions from 'src/app/store/commercial/commercial.actions';
import { DatabaseService } from '../../core/services/database.service';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { SyncErrorService } from 'src/app/core/services/sync-error.service';
import { DataInitializationService } from '../../core/services/data-initialization.service';
import { MemoryManagementService, MemoryStats } from '../../core/services/memory-management.service';
import { PhotoSyncService } from '../../core/services/photo-sync.service';
import { SynchronizationService } from 'src/app/core/services/synchronization.service';
import { environment } from 'src/environments/environment';
import { SyncDateFilterOption, SYNC_DATE_FILTER_LABELS } from 'src/app/models/sync-date-filter.model';
import { PdfReportService } from 'src/app/core/services/pdf-report.service';
import { DailyConsentHistoryRepository } from 'src/app/core/daily-consent/repositories/daily-consent-history.repository';
import { SyncConsentHistoryRepository } from 'src/app/core/sync-consent/repositories/sync-consent-history.repository';
import { DailyConsentHistoryRecord } from 'src/app/core/daily-consent/models/daily-consent-history.model';
import { SyncConsentHistoryRecord } from 'src/app/core/sync-consent/models/sync-consent-history.model';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { ExportLocationService } from '../../core/services/export-location.service';
import { AppUpdateService } from '../../core/services/app-update.service';
import { MobileAppReleaseInfo } from 'src/app/models/mobile-app-release.model';
import {
  AutoSyncIntervalMinutes,
  HybridSyncPreferenceService
} from '../../core/services/hybrid-sync-preference.service';
import { AutoSyncSchedulerService } from '../../core/services/auto-sync-scheduler.service';

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
  autoSyncIntervalMinutes: AutoSyncIntervalMinutes = 120;
  autoSyncIntervalLabel = 'Toutes les 2 heures';
  autoLock = false;
  autoLockDuration = 2;
  enableProfilePhotoSync = false;
  enableCardPhotoSync = false;
  totalClients$: Observable<number>;
  activeCreditsCount$: Observable<number>;
  collectionRate$: Observable<number>;
  pendingErrorsCount$!: Observable<number>;
  appVersion: string = environment.version;
  updateInProgress = false;
  updateProgressLabel = '';

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
    private readonly router: Router,
    private readonly pdfReportService: PdfReportService,
    private readonly dailyConsentHistoryRepository: DailyConsentHistoryRepository,
    private readonly syncConsentHistoryRepository: SyncConsentHistoryRepository,
    private readonly exportLocationService: ExportLocationService,
    private readonly appUpdateService: AppUpdateService,
    private readonly hybridSyncPreferenceService: HybridSyncPreferenceService,
    private readonly autoSyncSchedulerService: AutoSyncSchedulerService
  ) {
    this.user$ = this.store.select(selectAuthUser).pipe(
      switchMap(user => this.store.select(selectCommercialByUsername(user?.username || '')))
    );
    this.totalClients$ = this.store.select(selectClientKpiTotalByCommercial);
    this.activeCreditsCount$ = this.store.select(selectDistributionKpiActiveByCommercial);
    this.collectionRate$ = this.store.select(selectCollectionRateKpi);
    this.memoryStats$ = this.memoryManagementService.getMemoryStats();
  }

  async ngOnInit() {
    this.autoSync = await this.hybridSyncPreferenceService.getAutoSyncEnabled();
    this.autoSyncIntervalMinutes = await this.hybridSyncPreferenceService.getAutoSyncIntervalMinutes();
    this.updateAutoSyncIntervalLabel();
    this.autoLock = await this.storage.get('autoLock') || true;
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
        this.store.dispatch(CommercialActions.loadCommercial({ commercialUsername: user.username }));
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
    this.router.navigateByUrl('/change-password');
  }

  async logout() {
    this.proceedToLogout();
  }

  private proceedToLogout() {
    this.store.dispatch(AuthActions.logout());
  }

  onSyncToggleChange() {
    void this.hybridSyncPreferenceService.setAutoSyncEnabled(this.autoSync);
    void this.autoSyncSchedulerService.refreshScheduler();
  }

  async onAutoSyncIntervalChange() {
    await this.hybridSyncPreferenceService.setAutoSyncIntervalMinutes(this.autoSyncIntervalMinutes);
    this.updateAutoSyncIntervalLabel();
    await this.autoSyncSchedulerService.refreshScheduler();
    this.cdr.markForCheck();
  }

  private updateAutoSyncIntervalLabel(): void {
    this.autoSyncIntervalLabel = this.hybridSyncPreferenceService.getAutoSyncIntervalLabel(this.autoSyncIntervalMinutes);
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

  async downloadConsentHistoriesPdf(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Génération du PDF des consentements...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const currentUser = await firstValueFrom(this.store.select(selectAuthUser).pipe(take(1)));
      const username = currentUser?.username ?? null;

      if (!username) {
        throw new Error('Utilisateur non connecté.');
      }

      const [dailyHistories, syncHistories] = await Promise.all([
        this.dailyConsentHistoryRepository.findByCommercialUsername(username),
        this.syncConsentHistoryRepository.findByCommercialUsername(username)
      ]);

      if (dailyHistories.length === 0 && syncHistories.length === 0) {
        await loading.dismiss();
        await this.presentToast('Aucun historique de consentement à exporter.', 'warning', 'top');
        return;
      }

      const filename = this.buildConsentPdfFilename();
      const html = this.buildConsentHistoriesHtml(username, dailyHistories, syncHistories);
      const pdfBase64 = await this.pdfReportService.generatePDF(html, filename);

      const isWeb = Capacitor.getPlatform() === 'web';
      const directory = isWeb ? Directory.Data : Directory.Documents;
      const folder = 'elykia/consent';
      const filePath = `${folder}/${filename}`;

      await Filesystem.mkdir({
        path: folder,
        directory,
        recursive: true
      });

      await Filesystem.writeFile({
        path: filePath,
        data: pdfBase64,
        directory,
        recursive: true
      });

      await loading.dismiss();

      try {
        await this.exportLocationService.openExportLocation({
          folderPath: folder,
          filePath,
          directory,
          fileName: filename
        });
        await this.presentToast('PDF enregistré. Dossier ouvert.', 'success', 'top');
      } catch (openError) {
        console.warn('Ouverture du dossier d\'export impossible:', openError);
        const folderLabel = this.exportLocationService.getHumanReadableFolderPath(folder);
        await this.presentToast(`PDF enregistré dans ${folderLabel}`, 'success', 'top');
      }
    } catch (error) {
      await loading.dismiss();
      console.error('Erreur export consentements:', error);
      await this.presentToast('Erreur lors de la génération du PDF des consentements.', 'danger', 'top');
    }
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

  private buildConsentPdfFilename(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
    return `consent-histories-${date}.pdf`;
  }

  private buildConsentHistoriesHtml(
    username: string,
    dailyHistories: DailyConsentHistoryRecord[],
    syncHistories: SyncConsentHistoryRecord[]
  ): string {
    const dailyRows = dailyHistories.length > 0
      ? dailyHistories.map(item => `
        <tr>
          <td>${this.escapeHtml(item.actionDate)}</td>
          <td>${this.escapeHtml(this.formatDateTime(item.consentedAt))}</td>
          <td>${this.escapeHtml(item.challengeCode)}</td>
          <td>${this.escapeHtml(item.challengeEntered)}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="4">Aucun consentement journalier trouvé.</td></tr>`;

    const syncRows = syncHistories.length > 0
      ? syncHistories.map(item => `
        <tr>
          <td>${this.escapeHtml(item.actionDate)}</td>
          <td>${this.escapeHtml(this.formatDateTime(item.consentedAt))}</td>
          <td>${this.escapeHtml(item.challengeCode)}</td>
          <td>${this.escapeHtml(item.challengeEntered)}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="4">Aucun consentement de synchronisation trouvé.</td></tr>`;

    return `
      <div style="font-family: Arial, sans-serif; font-size: 12px; color: #111;">
        <h1 style="font-size: 20px; margin-bottom: 4px;">Historique des consentements</h1>
        <p style="margin-top: 0;">Utilisateur: <strong>${this.escapeHtml(username)}</strong></p>
        <p>Exporté le: ${this.escapeHtml(this.formatDateTime(new Date().toISOString()))}</p>

        <h2 style="margin-top: 24px; font-size: 16px;">Consentements journaliers</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #ccc; padding: 6px;">Date action</th>
              <th style="border: 1px solid #ccc; padding: 6px;">Consenti le</th>
              <th style="border: 1px solid #ccc; padding: 6px;">Code affiché</th>
              <th style="border: 1px solid #ccc; padding: 6px;">Code saisi</th>
            </tr>
          </thead>
          <tbody>${dailyRows}</tbody>
        </table>

        <h2 style="margin-top: 24px; font-size: 16px;">Consentements de synchronisation</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #ccc; padding: 6px;">Date action</th>
              <th style="border: 1px solid #ccc; padding: 6px;">Consenti le</th>
              <th style="border: 1px solid #ccc; padding: 6px;">Code affiché</th>
              <th style="border: 1px solid #ccc; padding: 6px;">Code saisi</th>
            </tr>
          </thead>
          <tbody>${syncRows}</tbody>
        </table>
      </div>
    `;
  }

  private formatDateTime(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString('fr-FR');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  async checkForAppUpdate(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      await this.presentToast('La mise à jour in-app est disponible uniquement sur l\'application Android.', 'warning', 'top');
      return;
    }

    this.updateInProgress = true;
    this.updateProgressLabel = 'Vérification de la version...';
    this.cdr.markForCheck();

    try {
      const release = await this.appUpdateService.checkForUpdate();

      if (!release.updateAvailable) {
        await this.presentToast('Votre application est déjà à jour.', 'success', 'top');
        return;
      }

      const confirmed = await this.confirmAppUpdate(release);
      if (!confirmed) {
        return;
      }

      await this.appUpdateService.downloadAndInstall(release, (progress) => {
        switch (progress.phase) {
          case 'downloading':
            this.updateProgressLabel = progress.percent != null
              ? `Téléchargement... ${progress.percent}%`
              : 'Téléchargement en cours...';
            break;
          case 'verifying':
            this.updateProgressLabel = 'Vérification du fichier...';
            break;
          case 'installing':
            this.updateProgressLabel = 'Lancement de l\'installation...';
            break;
          default:
            this.updateProgressLabel = 'Mise à jour en cours...';
        }
        this.cdr.markForCheck();
      });

      await this.presentToast(
        'Installation lancée. Suivez les instructions Android pour terminer la mise à jour.',
        'success',
        'top',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de mettre à jour l\'application.';
      await this.presentToast(message, 'danger', 'top');
      console.error('App update error:', error);
    } finally {
      this.updateInProgress = false;
      this.updateProgressLabel = '';
      this.cdr.markForCheck();
    }
  }

  private async confirmAppUpdate(release: MobileAppReleaseInfo): Promise<boolean> {
    const sizeMb = release.sizeBytes > 0
      ? (release.sizeBytes / (1024 * 1024)).toFixed(1)
      : null;
    const sizeLine = sizeMb ? `\n\nTaille : ${sizeMb} Mo` : '';
    const notes = release.releaseNotes?.trim()
      ? `\n\n${release.releaseNotes.trim()}`
      : '';
    const mandatoryLine = release.updateRequired || release.mandatory
      ? '\n\nCette mise à jour est obligatoire.'
      : '';

    return new Promise<boolean>((resolve) => {
      this.alertController.create({
        header: 'Mise à jour disponible',
        message: `Version ${release.version} disponible (vous êtes en ${this.appVersion}).${sizeLine}${notes}${mandatoryLine}`,
        buttons: [
          {
            text: release.updateRequired || release.mandatory ? 'Plus tard' : 'Annuler',
            role: 'cancel',
            handler: () => resolve(false),
          },
          {
            text: 'Mettre à jour',
            handler: () => resolve(true),
          },
        ],
      }).then((alert) => alert.present());
    });
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
