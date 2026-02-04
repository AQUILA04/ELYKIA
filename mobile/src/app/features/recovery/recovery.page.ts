import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
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
import { LoggerService } from '../../core/services/logger.service';

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
  recoveryAmount: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalController: ModalController,
    private toastController: ToastController,
    private store: Store,
    private actions$: Actions,
    private log: LoggerService,
    private cdr: ChangeDetectorRef
  ) {}

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
      .subscribe(client => {
        if (client) {
          this.store.dispatch(RecoveryActions.loadClientCredits({ clientId: client.id }));
        }
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
        this.store.dispatch({ type: '[Distribution] Load Distributions', payload: { commercialUsername: user.username } });

        // Forcer la mise à jour de la vue
        this.cdr.markForCheck();
      }

      // Attendre un peu avant de réinitialiser complètement l'état pour laisser le temps aux données de se mettre à jour
      setTimeout(() => {
        this.store.dispatch(RecoveryActions.clearRecoveryState());
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
  }

  onConfirmRecovery() {
    this.store.select(selectAuthUser).pipe(take(1))
      .pipe(withLatestFrom(this.vm$))
      .subscribe(async ([user, vm]) => {
        if (vm.selectedCredit && this.recoveryAmount > 0 && vm.client && user) {
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
            isDefaultStake: isDefaultStake
          };
          this.store.dispatch(RecoveryActions.createRecovery({ recovery, distribution: vm.selectedCredit }));
        }
      });
  }

  goBack() {
    this.router.navigate(['/clients']);
  }

  canConfirmRecovery(vm: RecoveryViewModel): boolean {
    return !!(vm.client && vm.selectedCredit && this.recoveryAmount > 0);
  }

  trackByCreditId(index: number, credit: Distribution): string {
    return credit.id;
  }
}
