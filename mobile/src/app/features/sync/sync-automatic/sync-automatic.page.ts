import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { AsyncPipe, DecimalPipe, JsonPipe, CommonModule } from '@angular/common';
import { IonItem, IonLabel,
  IonIcon, IonSpinner, IonButton, IonProgressBar
} from '@ionic/angular/standalone';

import * as SyncActions from '../../../store/sync/sync.actions';
import {
  selectAutomaticSyncIsActive,
  selectAutomaticSyncProgress,
  selectAutomaticSyncResult,
  selectAutomaticSyncStatus,
  selectAutomaticSyncError,
  selectCanCancelAutomaticSync,
  selectSyncSteps,
  selectCashDeskReady,
  selectCashDeskChecking,
  selectCashDeskOpening,
  selectCashDeskError
} from '../../../store/sync/sync.selectors';

import { SyncProgress, SyncResult, SyncStatus } from '../../../models/sync.model';

@Component({
  selector: 'app-sync-automatic',
  templateUrl: './sync-automatic.page.html',
  styleUrls: ['./sync-automatic.page.scss'],
  standalone: true,
  imports: [
    CommonModule, AsyncPipe, DecimalPipe, JsonPipe,
    IonItem, IonLabel,
    IonIcon, IonSpinner, IonButton
  ]
})
export class SyncAutomaticPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Observables pour l'état de synchronisation
  isActive$: Observable<boolean>;
  progress$: Observable<SyncProgress | null>;
  result$: Observable<SyncResult | null>;
  status$: Observable<SyncStatus>;
  error$: Observable<any>;
  canCancel$: Observable<boolean>;
  syncSteps$: Observable<any[]>;

  // Observables pour l'état de la caisse
  cashDeskReady$: Observable<boolean>;
  cashDeskChecking$: Observable<boolean>;
  cashDeskOpening$: Observable<boolean>;
  cashDeskError$: Observable<any>;

  // État local
  showSuccessAnimation = false;
  showErrorDetails = false;

  constructor(
    private store: Store,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    // Initialiser les observables
    this.isActive$ = this.store.select(selectAutomaticSyncIsActive);
    this.progress$ = this.store.select(selectAutomaticSyncProgress);
    this.result$ = this.store.select(selectAutomaticSyncResult);
    this.status$ = this.store.select(selectAutomaticSyncStatus);
    this.error$ = this.store.select(selectAutomaticSyncError);
    this.canCancel$ = this.store.select(selectCanCancelAutomaticSync);
    this.syncSteps$ = this.store.select(selectSyncSteps);

    this.cashDeskReady$ = this.store.select(selectCashDeskReady);
    this.cashDeskChecking$ = this.store.select(selectCashDeskChecking);
    this.cashDeskOpening$ = this.store.select(selectCashDeskOpening);
    this.cashDeskError$ = this.store.select(selectCashDeskError);
  }

  ngOnInit() {
    // Vérifier le statut de la caisse au chargement
    this.store.dispatch(SyncActions.checkCashDeskStatus());

    // Écouter les changements de statut pour gérer les animations
    this.status$.pipe(
      takeUntil(this.destroy$),
      filter(status => status === SyncStatus.COMPLETED)
    ).subscribe(() => {
      this.showSuccessAnimation = true;
    });

    // Écouter les erreurs de caisse
    this.cashDeskError$.pipe(
      takeUntil(this.destroy$),
      filter(error => !!error)
    ).subscribe(error => {
      this.showCashDeskError(error);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ionViewWillEnter() {
    this.store.dispatch(SyncActions.resetSyncState());
  }

  /**
   * Démarrer la synchronisation automatique
   */
  async startSync() {
    // Confirmer avant de démarrer
    const alert = await this.alertController.create({
      header: 'Confirmer la synchronisation',
      message: 'Voulez-vous démarrer la synchronisation de toutes vos données ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Synchroniser',
          handler: () => {
            this.store.dispatch(SyncActions.startAutomaticSync());
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Annuler la synchronisation
   */
  async cancelSync() {
    const alert = await this.alertController.create({
      header: 'Annuler la synchronisation',
      message: 'Êtes-vous sûr de vouloir annuler la synchronisation en cours ?',
      buttons: [
        {
          text: 'Continuer',
          role: 'cancel'
        },
        {
          text: 'Annuler',
          handler: () => {
            this.store.dispatch(SyncActions.cancelAutomaticSync());
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Gérer le cas où la caisse n'est pas prête
   */
  async handleCashDeskNotReady() {
    const alert = await this.alertController.create({
      header: 'Caisse fermée',
      message: 'Votre caisse doit être ouverte pour effectuer la synchronisation. Voulez-vous l\'ouvrir maintenant ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Ouvrir la caisse',
          handler: () => {
            this.store.dispatch(SyncActions.openCashDesk());
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Afficher l'erreur de caisse
   */
  private async showCashDeskError(error: any) {
    const alert = await this.alertController.create({
      header: 'Erreur de caisse',
      message: error.message || 'Une erreur est survenue lors de l\'ouverture de la caisse.',
      buttons: [
        {
          text: 'Réessayer',
          handler: () => {
            this.store.dispatch(SyncActions.checkCashDeskStatus());
          }
        },
        {
          text: 'Fermer',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  /**
   * Afficher les détails d'erreur
   */
  toggleErrorDetails() {
    this.showErrorDetails = !this.showErrorDetails;
  }

  /**
   * Réessayer la synchronisation
   */
  retrySync() {
    this.store.dispatch(SyncActions.resetSyncState());
    this.startSync();
  }

  /**
   * Naviguer vers la page des erreurs
   */
  viewErrors() {
    this.router.navigate(['/sync-errors']);
  }

  /**
   * Retourner à la page précédente
   */
  navigateBack() {
    this.router.navigate(['/tabs/dashboard']);
  }

  /**
   * Obtenir l'icône pour une étape
   */
  getStepIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'active':
        return 'sync';
      case 'error':
        return 'close-circle';
      default:
        return 'ellipse-outline';
    }
  }

  /**
   * Obtenir la couleur pour une étape
   */
  getStepColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'primary';
      case 'error':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Formater la durée
   */
  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Obtenir le message de résultat
   */
  getResultMessage(result: SyncResult): string {
    if (result.success) {
      return `Synchronisation réussie ! ${result.successCount} éléments synchronisés.`;
    } else {
      return `Synchronisation terminée avec ${result.errorCount} erreur(s). ${result.successCount} éléments synchronisés.`;
    }
  }
}
