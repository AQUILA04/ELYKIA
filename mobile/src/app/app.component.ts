import { Component, OnInit } from '@angular/core';
import { AlertController, Platform, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import {  selectAuthUser } from './store/auth/auth.selectors';
import { DataInitializationService } from './core/services/data-initialization.service';
import { filter, take } from 'rxjs/operators';
import { Storage } from '@ionic/storage-angular';
import { ActivityService } from './core/services/activity.service';
import * as AuthActions from './store/auth/auth.actions';
import { InitializationStateService } from './core/services/initialization-state.service';
import { StatusBar, Style } from '@capacitor/status-bar';
import { MemoryAlertService } from './core/services/memory-alert.service';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { SynchronizationService } from "./core/services/synchronization.service";
import { Router } from "@angular/router";
import { App } from "@capacitor/app";
import { Capacitor } from '@capacitor/core';
import {FirebaseCrashlytics} from "@capacitor-firebase/crashlytics";
import { FeatureFlagService, FeatureFlags } from './core/services/feature-flag.service';
import { DeviceIdentityService } from './core/services/device-identity.service';
import { AutoSyncSchedulerService } from './core/services/auto-sync-scheduler.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private dataInitialized = false;

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
    private readonly autoSyncSchedulerService: AutoSyncSchedulerService
  ) { this.initializeApp().then(r => console.log(r) ); }

  async ngOnInit() {
    this.platform.ready().then(() => {
      this.dataInitializationService.scheduleBackup();
      this.setupBackButtonHandler();

      // Démarrer la surveillance mémoire automatique
      this.memoryAlertService.startMemoryMonitoring();
    });

    this.store.select(selectAuthUser).pipe(
      filter(user => !!user),
      take(1)
    ).subscribe(async user => {
      this.initState.setUser(user);
    });
    this.activityService.startWatching().subscribe(() => {
      this.handleLogoutRequest();
    });
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

  private async handleLogoutRequest() {
    const hasUnsyncedData = await this.synchronizationService.hasUnsyncedData();
    if (hasUnsyncedData) {
      const alert = await this.alertController.create({
        header: 'Données non synchronisées',
        message: 'Vous avez des modifications non synchronisées. Si vous vous déconnectez maintenant, elles seront perdues. Voulez-vous vraiment continuer ?',
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
  }

  /** Aligné sur --ion-color-primary (barre de statut + en-têtes dashboard). */
  private static readonly STATUS_BAR_COLOR = '#1976D2';

  private async configureStatusBar(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await StatusBar.setOverlaysWebView({ overlay: false });

    if (Capacitor.getPlatform() === 'android') {
      // Style.Dark = icônes claires pour fond sombre/coloré (cf. @capacitor/status-bar Style enum).
      await StatusBar.setBackgroundColor({ color: AppComponent.STATUS_BAR_COLOR });
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
