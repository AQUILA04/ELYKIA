import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Capacitor } from '@capacitor/core';
import { Subscription } from 'rxjs';
import * as AuthActions from '../../store/auth/auth.actions';
import { AppUpdateService } from '../../core/services/app-update.service';
import { RmOfflinePackService } from '../../core/services/rm/rm-offline-pack.service';
import { RmScopeService } from '../../core/services/rm/rm-scope.service';
import { RmCloseQueueService } from '../../core/services/rm/rm-close-queue.service';
import { RmCloseSyncService } from '../../core/services/rm/rm-close-sync.service';
import { RmContactQueueService } from '../../core/services/rm/rm-contact-queue.service';
import { RmContactSyncService } from '../../core/services/rm/rm-contact-sync.service';
import { RmFieldControlQueueService } from '../../core/services/rm/rm-field-control-queue.service';
import { RmFieldControlSyncService } from '../../core/services/rm/rm-field-control-sync.service';
import { RmTontineFieldControlQueueService } from '../../core/services/rm/rm-tontine-field-control-queue.service';
import { RmTontineFieldControlSyncService } from '../../core/services/rm/rm-tontine-field-control-sync.service';
import { RmCarnetVerificationQueueService } from '../../core/services/rm/rm-carnet-verification-queue.service';
import { RmCarnetVerificationSyncService } from '../../core/services/rm/rm-carnet-verification-sync.service';
import { FieldDayPlan, RmOfflinePack } from '../../core/services/rm/rm.models';
import { RmCloseOp } from '../../core/services/rm/rm-close.models';
import { RmContactPatch } from '../../core/services/rm/rm-contact.models';
import { RmFieldControlOp } from '../../core/services/rm/rm-field-control.models';
import { RmTontineFieldControlOp } from '../../core/services/rm/rm-tontine-field-control.models';
import { RmCarnetVerificationOp } from '../../core/services/rm/rm-carnet-verification.models';
import { MobileAppReleaseInfo } from 'src/app/models/mobile-app-release.model';
import { environment } from 'src/environments/environment';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-rm-more',
  templateUrl: './rm-more.page.html',
  styleUrls: ['./rm-more.page.scss'],
  standalone: false,
})
export class RmMorePage implements OnInit, OnDestroy {
  plan: FieldDayPlan | null = null;
  pack: RmOfflinePack | null = null;
  pendingOps: RmCloseOp[] = [];
  pendingContacts: RmContactPatch[] = [];
  pendingControls: RmFieldControlOp[] = [];
  pendingTontineControls: RmTontineFieldControlOp[] = [];
  pendingCarnetVerifications: RmCarnetVerificationOp[] = [];
  appVersion = environment.version;
  updateInProgress = false;
  updateProgressLabel = '';
  private subs: Subscription[] = [];

  constructor(
    private readonly scope: RmScopeService,
    private readonly packService: RmOfflinePackService,
    private readonly closeQueue: RmCloseQueueService,
    private readonly closeSync: RmCloseSyncService,
    private readonly contactQueue: RmContactQueueService,
    private readonly contactSync: RmContactSyncService,
    private readonly fieldControlQueue: RmFieldControlQueueService,
    private readonly fieldControlSync: RmFieldControlSyncService,
    private readonly tontineFieldControlQueue: RmTontineFieldControlQueueService,
    private readonly tontineFieldControlSync: RmTontineFieldControlSyncService,
    private readonly carnetQueue: RmCarnetVerificationQueueService,
    private readonly carnetSync: RmCarnetVerificationSyncService,
    private readonly store: Store,
    private readonly router: Router,
    private readonly loadingCtrl: LoadingController,
    private readonly toastCtrl: ToastController,
    private readonly alertController: AlertController,
    private readonly appUpdateService: AppUpdateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.plan = this.scope.getPlan();
    this.pack = this.scope.getPack();
    this.subs.push(
      this.closeQueue.ops$.subscribe(ops => {
        this.pendingOps = ops.filter(o => !o.isSync);
      }),
      this.contactQueue.patches$.subscribe(patches => {
        this.pendingContacts = patches.filter(p => !p.isSync);
      }),
      this.fieldControlQueue.ops$.subscribe(ops => {
        this.pendingControls = ops.filter(o => !o.isSync);
      }),
      this.tontineFieldControlQueue.ops$.subscribe(ops => {
        this.pendingTontineControls = ops.filter(o => !o.isSync);
      }),
      this.carnetQueue.ops$.subscribe(ops => {
        this.pendingCarnetVerifications = ops.filter(o => !o.isSync);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get pendingTotal(): number {
    return this.pendingOps.length
      + this.pendingContacts.length
      + this.pendingControls.length
      + this.pendingTontineControls.length
      + this.pendingCarnetVerifications.length;
  }

  async refreshPack(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Actualisation du pack…', spinner: 'crescent' });
    await loading.present();
    try {
      const result = await this.packService.refreshPack();
      this.pack = result.pack;
      this.plan = this.scope.getPlan();
      await loading.dismiss();
      await this.toast('Pack actualisé', 'success');
    } catch (e: any) {
      await loading.dismiss();
      await this.toast(e?.message || 'Échec actualisation', 'danger');
    }
  }

  async syncPending(): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Synchronisation…', spinner: 'crescent' });
    await loading.present();
    try {
      const contacts = await this.contactSync.syncPending();
      const controls = await this.fieldControlSync.syncPending();
      const tontineControls = await this.tontineFieldControlSync.syncPending();
      const carnets = await this.carnetSync.syncPending();
      const closes = await this.closeSync.syncPending();
      await loading.dismiss();
      const synced = contacts.synced + controls.synced + tontineControls.synced + carnets.synced + closes.synced;
      const failed = contacts.failed + controls.failed + tontineControls.failed + carnets.failed + closes.failed;
      const firstError = contacts.errors[0]
        || controls.errors[0]
        || tontineControls.errors[0]
        || carnets.errors[0]
        || closes.errors[0];
      if (failed === 0) {
        await this.toast(`${synced} opération(s) synchronisée(s)`, 'success');
      } else {
        await this.toast(
          `${synced} OK · ${failed} échec(s)${firstError ? ' — ' + firstError : ''}`,
          'warning'
        );
      }
    } catch (e: any) {
      await loading.dismiss();
      await this.toast(e?.message || 'Échec sync', 'danger');
    }
  }

  async changePlan(): Promise<void> {
    await this.scope.clear();
    await this.router.navigateByUrl('/rm/plan');
  }

  logout(): void {
    void this.scope.clear();
    void this.closeQueue.clearAll();
    void this.contactQueue.clearAll();
    void this.fieldControlQueue.clearAll();
    void this.tontineFieldControlQueue.clearAll();
    void this.carnetQueue.clearAll();
    this.store.dispatch(AuthActions.logout());
  }

  async checkForAppUpdate(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      await this.toast(
        'La mise à jour in-app est disponible uniquement sur l\'application Android.',
        'warning'
      );
      return;
    }

    this.updateInProgress = true;
    this.updateProgressLabel = 'Vérification de la version...';
    this.cdr.markForCheck();

    try {
      const release = await this.appUpdateService.checkForUpdate();

      if (!release.updateAvailable) {
        await this.toast('Votre application est déjà à jour.', 'success');
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

      await this.toast(
        'Installation lancée. Suivez les instructions Android pour terminer la mise à jour.',
        'success'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Impossible de mettre à jour l\'application.';
      await this.toast(message, 'danger');
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

  formatOp(op: RmCloseOp): string {
    const kind = op.isPartial ? 'Partiel' : 'Total';
    const amount = new Intl.NumberFormat('fr-FR').format(Math.round(op.amount || 0));
    return `${kind} · ${amount} FCFA`;
  }

  private async toast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2800, color, position: 'top' });
    await t.present();
  }
}
