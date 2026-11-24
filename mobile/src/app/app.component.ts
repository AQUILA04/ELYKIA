import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, Platform, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import {  selectAuthUser } from './store/auth/auth.selectors';
import { DataInitializationService } from './core/services/data-initialization.service';
import { AuthService } from './core/services/auth.service';
import { filter, take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Storage } from '@ionic/storage-angular';
import { ActivityService } from './core/services/activity.service';
import * as AuthActions from './store/auth/auth.actions';
import { InitializationStateService } from './core/services/initialization-state.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { MemoryAlertService } from './core/services/memory-alert.service';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { SynchronizationService } from "./core/services/synchronization.service";
import { NavigationEnd, Router } from "@angular/router";
import { App } from "@capacitor/app";
import { Capacitor } from '@capacitor/core';
import {FirebaseCrashlytics} from "@capacitor-firebase/crashlytics";
import { FeatureFlagService, FeatureFlags } from './core/services/feature-flag.service';
import { DeviceIdentityService } from './core/services/device-identity.service';
import { AutoSyncSchedulerService } from './core/services/auto-sync-scheduler.service';
import { RmPendingSyncCoordinator } from './core/services/rm/rm-pending-sync.coordinator';
import { RmQueueSnapshotService } from './core/services/rm/rm-queue-snapshot.service';
import { environment } from '../environments/environment';
import { resolveEnvironmentLabel } from './core/utils/environment-label.util';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private dataInitialized = false;
  private readonly destroy$ = new Subject<void>();

  readonly envLabel: string | null = resolveEnvironmentLabel({
    envName: (environment as { envName?: string }).envName,
    apiUrl: environment.apiUrl
  });
  envBannerProminent = true;

  constructor(
    private readonly platform: Platform,
    private readonly store: Store,
    private readonly dataInitializationService: DataInitializationService,
    private readonly storage: Storage,
    private readonly navCtrl: NavController,
    private readonly activityService: ActivityService,
    private readonly initState: InitializationStateService,
    private readonly memoryAlertService: MemoryAlertService,
    private readonly synchronizationService: SynchronizationService,
    private readonly alertController: AlertController,
    private readonly router: Router,
    private readonly featureFlagService: FeatureFlagService,
    private readonly deviceIdentityService: DeviceIdentityService,
    private readonly autoSyncSchedulerService: AutoSyncSchedulerService,
    private readonly rmPendingSync: RmPendingSyncCoordinator,
    private readonly rmQueueSnapshot: RmQueueSnapshotService,
    private readonly authService: AuthService
  ) { this.initializeApp().then(r => console.log(r) ); }

  async ngOnInit() {
    this.platform.ready().then(() => {
      this.dataInitializationService.scheduleBackup();
      this.setupBackButtonHandler();

      // Démarrer la surveillance mémoire automatique
      this.memoryAlertService.startMemoryMonitoring();
    });

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event) => {
      const url = event.urlAfterRedirects || event.url;
      this.envBannerProminent = url.includes('/login') || url === '/' || url.startsWith('/login');
    });
    this.envBannerProminent =
      this.router.url.includes('/login') || this.router.url === '/' || this.router.url.startsWith('/login');

    this.store.select(selectAuthUser).pipe(
      filter(user => !!user),
      take(1)
    ).subscribe(async user => {
      this.initState.setUser(user);
    });
    this.authService.sessionExpiredKeptData$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      void this.showSessionExpiredKeepingDataAlert();
    });
    this.activityService.startWatching().subscribe(() => {
      this.handleLogoutRequest();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupBackButtonHandler() {
    this.platform.backButton.subscribeWithPriority(10, async () => {
      const url = this.router.url;
      
      if (url === '/tabs/dashboard' || url === '/tabs/clients' || url === '/tabs/distributions' || url === '/tabs/more') {
        const hasUnsyncedData = await this.synchronizationService.hasUnsyncedData();
        if (hasUnsyncedData) {
          this.showExitConfirmationAlert();
        } else {
          App.exitApp();
        }
      } else {
        this.navCtrl.back();
      }
    });
  }

  private async showExitConfirmationAlert() {
    const alert = await this.alertController.create({
      header: 'Données non synchronisées',
      message: 'Vous avez des modifications non synchronisées qui seront perdues si vous quittez l\'application. Voulez-vous vraiment quitter ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'Quitter',
          cssClass: 'danger',
          handler: () => {
            App.exitApp();
          }
        }
      ]
    });
    await alert.present();
  }

  /** 401 avec des saisies en attente : rien n'est effacé, on invite à se reconnecter pour les envoyer. */
  private async showSessionExpiredKeepingDataAlert() {
    const alert = await this.alertController.create({
      header: 'Session expirée',
      message: 'Votre session a expiré, mais vos saisies sont conservées sur le téléphone. '
        + 'Reconnectez-vous (avec du réseau) pour les envoyer au serveur.',
      backdropDismiss: false,
      buttons: [
        { text: 'Plus tard', role: 'cancel' },
        {
          text: 'Se reconnecter',
          handler: () => {
            this.store.dispatch(AuthActions.logout());
          }
        }
      ]
    });
    await alert.present();
  }

  private async handleLogoutRequest() {
    const hasUnsyncedData = await this.synchronizationService.hasUnsyncedData();
    if (hasUnsyncedData) {
      const alert = await this.alertController.create({
        header: 'Données non synchronisées',
        message: 'Vous avez des modifications non synchronisées. Elles restent sur le téléphone mais ne seront pas envoyées tant que vous n\'êtes pas reconnecté avec du réseau. Voulez-vous vraiment vous déconnecter ?',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel',
            cssClass: 'secondary',
          }, {
            text: 'Se déconnecter',
            cssClass: 'danger',
            handler: () => {
              this.store.dispatch(AuthActions.logout());
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.store.dispatch(AuthActions.logout());
    }
  }

  async initializeApp() {
    await this.platform.ready();
    await this.configureStatusBar();
    await this.featureFlagService.init();

    if (this.featureFlagService.isFeatureEnabled(FeatureFlags.MobileDeviceRestriction)) {
      await this.deviceIdentityService.getDeviceIdentity();
    }

    if (Capacitor.isNativePlatform()) {
      await FirebaseCrashlytics.setEnabled({
        enabled: true,
      });
    }

    await this.autoSyncSchedulerService.init();
    this.rmPendingSync.init();
    this.rmQueueSnapshot.init();
  }

  /** Aligné sur --ion-color-primary (barre de statut + en-têtes dashboard). */
  private static readonly STATUS_BAR_COLOR = '#1976D2';
  /** Hors prod : rouge pour renforcer le bandeau environnement. */
  private static readonly STATUS_BAR_NON_PROD_COLOR = '#DC2626';

  private async configureStatusBar(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await StatusBar.setOverlaysWebView({ overlay: false });

    if (Capacitor.getPlatform() === 'android') {
      // Style.Dark = icônes claires pour fond sombre/coloré (cf. @capacitor/status-bar Style enum).
      const color = this.envLabel
        ? AppComponent.STATUS_BAR_NON_PROD_COLOR
        : AppComponent.STATUS_BAR_COLOR;
      await StatusBar.setBackgroundColor({ color });
      await StatusBar.setStyle({ style: Style.Dark });
    } else {
      await StatusBar.setStyle({ style: Style.Default });
    }

    await StatusBar.show();
  }

  async saveToDownloads(imageData: string, fileName: string) {
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: imageData,
      directory: Directory.Documents,
      recursive: true
    });
    return savedFile;
  }
}
