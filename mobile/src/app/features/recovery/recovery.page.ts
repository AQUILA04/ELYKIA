import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Observable, Subject, combineLatest, firstValueFrom } from 'rxjs';
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
import { computeRecoveryReceiptBalances } from '../../core/services/printing.service';
import { ReliquatService } from '../../core/services/reliquat.service';
import { ClientReliquat, RecoveryPlan } from '../../models/reliquat.model';

interface RecoveryViewModel {
  client: Client | null;
  credits: Distribution[];
  selectedCredit: Distribution | null;
  isLoading: boolean;
  isCreatingRecovery: boolean;
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
    isCreatingRecovery: false,
    error: null
  };
  recoveryAmount: number = 0; // Montant à collecter (sélectionné par pastilles)
  receivedAmount: number = 0; // Montant remis par le client (saisi manuellement)
  clientReliquat: ClientReliquat | null = null;
  recoveryPlan: RecoveryPlan | null = null;
  useReliquat: boolean = true;
  keepReliquat: boolean = true;
  /** Garde anti double-tap pendant toute la chaîne de confirmation. */
  isSubmitting = false;

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
      isCreatingRecovery: this.store.select(RecoverySelectors.selectIsCreatingRecovery),
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
      .subscribe(() => {
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
      void this.log.log(
        `[RecoveryPage][CREATE_SUCCESS] recoveryId=${recovery.id} amount=${recovery.amount} ` +
        `client=${recovery.clientId} paymentDate=${recovery.paymentDate}`
      );

      this.isSubmitting = false;
      this.clearRecoveryFormFields();

      const toast = await this.toastController.create({ message: 'Recouvrement enregistré avec succès', duration: 3000, color: 'success', position: 'top' });
      await toast.present();

      if (vm.client && vm.selectedCredit && user) {
        const balances = computeRecoveryReceiptBalances(vm.selectedCredit, recovery.amount);
        const distributionForReceipt: Distribution = {
          ...vm.selectedCredit,
          paidAmount: (vm.selectedCredit.paidAmount || 0) + recovery.amount,
          remainingAmount: balances.newRemainingAmount,
        };
        this.store.dispatch(RecoveryActions.showRecoverySummary({
          recovery,
          client: vm.client,
          distribution: distributionForReceipt,
        }));
        this.store.dispatch(RecoveryActions.loadRecoveries({ commercialUsername: user.username }));
        this.store.dispatch(DistributionActions.loadDistributions({ commercialUsername: user.username }));
        this.cdr.markForCheck();
      }

      this.store.dispatch(RecoveryActions.resetRecoveryForm());
      if (vm.client) {
        this.clientReliquat = await this.reliquatService.getReliquatForClient(vm.client.id);
      }
      this.cdr.markForCheck();
    });

    this.actions$.pipe(
      ofType(RecoveryActions.createRecoveryFailure),
      takeUntil(this.destroy$)
    ).subscribe(async ({ error }) => {
      void this.log.error('[RecoveryPage][CREATE_FAILURE]', error);
      this.isSubmitting = false;
      this.cdr.markForCheck();

      const toast = await this.toastController.create({
        message: 'Échec de l\'enregistrement du recouvrement. Réessayez.',
        duration: 3500,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    });
  }

  private clearRecoveryFormFields(): void {
    this.recoveryAmount = 0;
    this.receivedAmount = 0;
    this.recoveryPlan = null;
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
        let effectiveReceived = this.receivedAmount > 0 ? this.receivedAmount : this.recoveryAmount;
        let amountCovered = this.recoveryAmount;

        const totalAvailable = effectiveReceived + (this.useReliquat && this.clientReliquat ? this.clientReliquat.totalAmount : 0);
        const stake = credit.dailyPayment;

        if (stake > 0 && totalAvailable > amountCovered) {
          const extraCash = totalAvailable - amountCovered;
          if (extraCash >= stake) {
            const extraStakes = Math.floor(extraCash / stake);
            amountCovered += extraStakes * stake;
            this.recoveryAmount = amountCovered;
          }
        }

        this.recoveryPlan = this.reliquatService.computeRecoveryPlan(
          amountCovered,
          effectiveReceived,
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

  async onConfirmRecovery() {
    if (this.isSubmitting || this.vm.isCreatingRecovery) {
      void this.log.log(
        `[RecoveryPage][BLOCKED] Double-tap ignored isSubmitting=${this.isSubmitting} ` +
        `isCreatingRecovery=${this.vm.isCreatingRecovery}`
      );
      return;
    }

    const user = await firstValueFrom(this.store.select(selectAuthUser).pipe(take(1)));
    const vm = await firstValueFrom(this.vm$.pipe(take(1)));

    if (!vm.selectedCredit || this.recoveryAmount <= 0 || !vm.client || !user) {
      return;
    }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    void this.log.log(
      `[RecoveryPage][CONFIRM_START] client=${vm.client.id} distribution=${vm.selectedCredit.id} ` +
      `amount=${this.recoveryAmount} receivedAmount=${this.receivedAmount} creditRef=${vm.selectedCredit.reference}`
    );

    try {
      const exists = await this.recoveryService.checkExistingRecoveryForToday(vm.client.id);

      if (exists) {
        const alert = await this.alertController.create({
          header: 'Confirmation',
          message: 'Un recouvrement a déjà été effectué pour ce client aujourd\'hui. Voulez-vous vraiment en ajouter un autre ?',
          buttons: [
            { text: 'Annuler', role: 'cancel' },
            { text: 'Confirmer', role: 'confirm' }
          ]
        });
        await alert.present();
        const { role } = await alert.onDidDismiss();

        if (role !== 'confirm') {
          void this.log.log(`[RecoveryPage][CANCELLED] User declined second recovery for client=${vm.client.id}`);
          this.isSubmitting = false;
          this.cdr.markForCheck();
          return;
        }
      }

      this.dispatchCreateRecovery(user, vm);
    } catch (error) {
      void this.log.error('[RecoveryPage][CONFIRM_ERROR]', error);
      this.isSubmitting = false;
      this.cdr.markForCheck();
    }
  }

  private dispatchCreateRecovery(user: { username: string }, vm: RecoveryViewModel) {
    if (!vm.selectedCredit || !vm.client) {
      this.isSubmitting = false;
      this.cdr.markForCheck();
      return;
    }

    const isDefaultStake = this.recoveryAmount === vm.selectedCredit.dailyPayment;
    const paymentDate = new Date().toISOString();

    const recovery: Partial<Recovery> = {
      amount: this.recoveryAmount,
      paymentDate,
      paymentMethod: 'CASH',
      distributionId: vm.selectedCredit.id,
      clientId: vm.client.id,
      commercialId: user.username,
      isLocal: true,
      isSync: false,
      isDefaultStake: isDefaultStake,
    };

    if (this.recoveryPlan) {
      recovery.reliquatGeneratedAmount = this.keepReliquat ? this.recoveryPlan.reliquatGenerated : 0;
      recovery.reliquatUsedAmount = this.recoveryPlan.reliquatUsed;
    } else {
      recovery.reliquatGeneratedAmount = 0;
      recovery.reliquatUsedAmount = 0;
    }

    void this.log.log(
      `[RecoveryPage][DISPATCH] client=${recovery.clientId} distribution=${recovery.distributionId} ` +
      `amount=${recovery.amount} isDefaultStake=${recovery.isDefaultStake} paymentDate=${paymentDate}`
    );

    // Réinitialiser immédiatement le formulaire pour empêcher un second envoi avec le même montant.
    this.clearRecoveryFormFields();
    this.cdr.markForCheck();

    this.store.dispatch(RecoveryActions.createRecovery({
      recovery,
      distribution: vm.selectedCredit,
      keepReliquat: this.keepReliquat
    }));
  }

  goBack() {
    this.router.navigate(['/clients']);
  }

  canConfirmRecovery(vm: RecoveryViewModel): boolean {
    if (this.isSubmitting || vm.isCreatingRecovery) {
      return false;
    }

    const hasBaseValid = !!(vm.client && vm.selectedCredit && this.recoveryAmount > 0);
    if (!hasBaseValid) return false;

    if (this.receivedAmount <= 0) return false;
    if (this.recoveryPlan) {
      if (this.receivedAmount < this.recoveryPlan.cashNeeded) {
        return false;
      }
      return true;
    }
    return false;
  }

  shouldShowConfirmFooter(vm: RecoveryViewModel): boolean {
    return !!(vm.client && vm.selectedCredit && (this.canConfirmRecovery(vm) || this.isSubmitting || vm.isCreatingRecovery));
  }

  trackByCreditId(index: number, credit: Distribution): string {
    return credit.id;
  }
}
