import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Observable, Subject, combineLatest } from 'rxjs';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { withLatestFrom, take, takeUntil, map } from 'rxjs/operators';

import { Client } from '../../models/client.model';
import { Distribution } from '../../models/distribution.model';
import { Recovery } from '../../models/recovery.model';
import { ClientSelectorModalComponent } from '../../shared/components/client-selector-modal/client-selector-modal.component';
import * as RecoveryActions from '../../store/recovery/recovery.actions';
import * as RecoverySelectors from '../../store/recovery/recovery.selectors';
import * as ClientActions from '../../store/client/client.actions';
import * as DistributionActions from '../../store/distribution/distribution.actions';
import { LoggerService } from '../../core/services/logger.service';
import { RecoveryService } from '../../core/services/recovery.service';
import { ReliquatService } from '../../core/services/reliquat.service';
import { ClientReliquat, RecoveryPlan } from '../../models/reliquat.model';

interface RecoveryViewModel {
  client: Client | null;
  credits: Distribution[];
  selectedCredit: Distribution | null;
  isLoading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-recovery',
  templateUrl: './recovery.page.html',
  styleUrls: ['./recovery.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecoveryPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  vm$!: Observable<RecoveryViewModel>;
  vm: RecoveryViewModel = {
    client: null,
    credits: [],
    selectedCredit: null,
    isLoading: false,
    error: null
  };
  recoveryAmount: number = 0; // Montant à collecter (sélectionné par pastilles)
  receivedAmount: number = 0; // Montant remis par le client (saisi manuellement)
  clientReliquat: ClientReliquat | null = null;
  recoveryPlan: RecoveryPlan | null = null;
  useReliquat: boolean = true;
  keepReliquat: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private store: Store,
    private actions$: Actions,
    private log: LoggerService,
    private cdr: ChangeDetectorRef,
    private recoveryService: RecoveryService,
    private reliquatService: ReliquatService
  ) { }

  ngOnInit() {
    this.log.log('[RecoveryPage] User entered recovery page.');

    this.vm$ = combineLatest({
      client: this.store.select(RecoverySelectors.selectSelectedClient),
      credits: this.store.select(RecoverySelectors.selectClientCredits),
      selectedCredit: this.store.select(RecoverySelectors.selectSelectedCredit),
      isLoading: this.store.select(RecoverySelectors.selectIsLoading),
      error: this.store.select(RecoverySelectors.selectError)
    }).pipe(
      takeUntil(this.destroy$)
    );

    // Subscribe to update the synchronous property for virtual scrolling
    this.vm$.subscribe(vm => {
      this.vm = vm;
      this.cdr.markForCheck();
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['clientId']) {
        this.store.dispatch(RecoveryActions.loadAndSelectClient({ clientId: params['clientId'] }));
      }
    });

    this.store.select(RecoverySelectors.selectSelectedClient)
      .pipe(takeUntil(this.destroy$))
      .subscribe(async client => {
        if (client) {
          this.store.dispatch(RecoveryActions.loadClientCredits({ clientId: client.id }));
          this.clientReliquat = await this.reliquatService.getReliquatForClient(client.id);
          this.updateRecoveryPlan();
          this.cdr.markForCheck();
        } else {
          this.clientReliquat = null;
          this.recoveryPlan = null;
          this.cdr.markForCheck();
        }
      });

    this.store.select(RecoverySelectors.selectSelectedCredit)
      .pipe(takeUntil(this.destroy$))
      .subscribe(credit => {
        this.updateRecoveryPlan();
      });

    this.setupActionListeners();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    // Ne pas vider l'état complet, seulement réinitialiser le formulaire
    this.store.dispatch(RecoveryActions.resetRecoveryForm());
  }

  private setupActionListeners() {
    this.actions$.pipe(
      ofType(RecoveryActions.createRecoverySuccess),
      withLatestFrom(this.store.select(selectAuthUser), this.vm$),
      takeUntil(this.destroy$)
    ).subscribe(async ([{ recovery }, user, vm]) => {
      const toast = await this.toastController.create({ message: 'Recouvrement enregistré avec succès', duration: 3000, color: 'success', position: 'top' });
      await toast.present();

      if (vm.client && vm.selectedCredit && user) {
        // Recharger toutes les données nécessaires
        this.store.dispatch(RecoveryActions.showRecoverySummary({ recovery, client: vm.client, distribution: vm.selectedCredit }));
        this.store.dispatch(RecoveryActions.loadRecoveries({ commercialUsername: user.username }));
        // this.store.dispatch(ClientActions.loadClientViewsUpdate()); // Géré par RecoveryEffects

        // Recharger les distributions pour mettre à jour les KPIs du dashboard
        this.store.dispatch(DistributionActions.loadDistributions({ commercialUsername: user.username }));

        // Forcer la mise à jour de la vue
        this.cdr.markForCheck();
      }

      // Attendre un peu avant de réinitialiser le formulaire pour laisser le temps aux données de se mettre à jour
      setTimeout(async () => {
        this.store.dispatch(RecoveryActions.resetRecoveryForm());
        this.recoveryAmount = 0;
        this.receivedAmount = 0;
        this.recoveryPlan = null;
        if (vm.client) {
          this.clientReliquat = await this.reliquatService.getReliquatForClient(vm.client.id);
        }
        this.cdr.markForCheck();
        // On ne vide PAS tout l'état (clearRecoveryState) pour ne pas perdre la liste des recouvrements
        // Si besoin de désélectionner le client, on peut le faire ici, mais resetRecoveryForm est souvent suffisant
      }, 1000);
    });
  }

  async openClientSelector() {
    this.log.log('[RecoveryPage] openClientSelector called.');
    const modal = await this.modalController.create({ component: ClientSelectorModalComponent, cssClass: 'client-selector-modal' });
    modal.onDidDismiss().then(result => {
      if (result.data?.client) {
        this.store.dispatch(RecoveryActions.setSelectedClient({ client: result.data.client }));
        this.log.log(`[RecoveryPage] Client selected: ${result.data.client.fullName}`);
      }
    });
    await modal.present();
  }

  onCreditSelected(distribution: Distribution) {
    this.store.dispatch(RecoveryActions.selectCredit({ distributionId: distribution.id }));
  }

  onAmountChanged(amount: number) {
    this.recoveryAmount = amount;
    this.store.dispatch(RecoveryActions.setRecoveryAmount({ amount }));
    this.updateRecoveryPlan();
  }

  updateRecoveryPlan() {
    this.store.select(RecoverySelectors.selectSelectedCredit).pipe(take(1)).subscribe(credit => {
      if (credit && this.recoveryAmount !== null) {
        // Le montant reçu est par défaut égal au montant à collecter s'il n'a pas été saisi
        let effectiveReceived = this.receivedAmount > 0 ? this.receivedAmount : this.recoveryAmount;
        let amountCovered = this.recoveryAmount;

        const totalAvailable = effectiveReceived + (this.useReliquat && this.clientReliquat ? this.clientReliquat.totalAmount : 0);
        const stake = credit.dailyPayment;

        if (stake > 0 && totalAvailable > amountCovered) {
          const extraCash = totalAvailable - amountCovered;
          // Si l'excédent dépasse ou est égal à une mise, on l'ajoute automatiquement au montant à collecter
          if (extraCash >= stake) {
            const extraStakes = Math.floor(extraCash / stake);
            amountCovered += extraStakes * stake;
            this.recoveryAmount = amountCovered; // Mettre à jour l'UI des pastilles
          }
        }

        this.recoveryPlan = this.reliquatService.computeRecoveryPlan(
          amountCovered,       // amountCovered (potentiellement auto-incrémenté)
          effectiveReceived,   // received
          this.clientReliquat ? this.clientReliquat.totalAmount : 0,
          this.useReliquat
        );
        this.cdr.markForCheck();
      } else {
        this.recoveryPlan = null;
        this.cdr.markForCheck();
      }
    });
  }

  onReceivedAmountChanged(amount: number) {
    this.receivedAmount = amount;
    this.updateRecoveryPlan();
  }

  onUseReliquatChanged(use: boolean) {
    this.useReliquat = use;
    this.updateRecoveryPlan();
  }

  onKeepReliquatChanged(keep: boolean) {
    this.keepReliquat = keep;
  }

  onConfirmRecovery() {
    this.store.select(selectAuthUser).pipe(take(1))
      .pipe(withLatestFrom(this.vm$))
      .subscribe(async ([user, vm]) => {
        if (vm.selectedCredit && this.recoveryAmount > 0 && vm.client && user) {

          // Vérifier si un recouvrement existe déjà pour ce client aujourd'hui
          const exists = await this.recoveryService.checkExistingRecoveryForToday(vm.client.id);

          if (exists) {
            const alert = await this.alertController.create({
              header: 'Confirmation',
              message: 'Un recouvrement a déjà été effectué pour ce client aujourd\'hui. Voulez-vous vraiment en ajouter un autre ?',
              buttons: [
                {
                  text: 'Annuler',
                  role: 'cancel',
                  cssClass: 'secondary',
                  handler: () => {
                    this.log.log('[RecoveryPage] Recovery cancelled by user due to existing recovery.');
                  }
                }, {
                  text: 'Confirmer',
                  handler: () => {
                    this.dispatchCreateRecovery(user, vm);
                  }
                }
              ]
            });
            await alert.present();
          } else {
            this.dispatchCreateRecovery(user, vm);
          }
        }
      });
  }

  private dispatchCreateRecovery(user: any, vm: RecoveryViewModel) {
    if (vm.selectedCredit && vm.client && this.recoveryPlan) {
      const isDefaultStake = this.recoveryAmount === vm.selectedCredit.dailyPayment;
      const recovery: Partial<Recovery> = {
        amount: this.recoveryAmount,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'CASH',
        distributionId: vm.selectedCredit.id,
        clientId: vm.client.id,
        commercialId: user.username,
        isLocal: true,
        isSync: false,
        isDefaultStake: isDefaultStake,
        reliquatGeneratedAmount: this.keepReliquat ? this.recoveryPlan.reliquatGenerated : 0,
        reliquatUsedAmount: this.recoveryPlan.reliquatUsed
      };
      this.store.dispatch(RecoveryActions.createRecovery({ recovery, distribution: vm.selectedCredit, keepReliquat: this.keepReliquat }));
    }
  }

  goBack() {
    this.router.navigate(['/clients']);
  }

  canConfirmRecovery(vm: RecoveryViewModel): boolean {
    const hasBaseValid = !!(vm.client && vm.selectedCredit && this.recoveryAmount > 0);
    if (!hasBaseValid) return false;
    
    // Le montant remis DOIT être saisi (> 0)
    if (this.receivedAmount <= 0) return false;

    if (this.recoveryPlan) {
      // Le montant remis doit être au moins égal au cashNeeded (espèces attendues)
      if (this.receivedAmount < this.recoveryPlan.cashNeeded) {
        return false;
      }
      return true;
    }
    return false;
  }

  trackByCreditId(index: number, credit: Distribution): string {
    return credit.id;
  }
}
