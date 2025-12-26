import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { Distribution } from '../../../../models/distribution.model';
import * as RecoveryActions from '../../../../store/recovery/recovery.actions';
import * as RecoverySelectors from '../../../../store/recovery/recovery.selectors';

@Component({
  selector: 'app-amount-input',
  templateUrl: './amount-input.component.html',
  styleUrls: ['./amount-input.component.scss'],
  standalone: false
})
export class AmountInputComponent implements OnInit, OnDestroy {
  @Input() selectedCredit!: Distribution;
  @Input() currentAmount: number = 0;
  @Output() amountChanged = new EventEmitter<number>();

  private destroy$ = new Subject<void>();

  amountControl = new FormControl(0, [
    Validators.required,
    Validators.min(1)
  ]);

  validationMessage: string = '';
  isValid: boolean = false;

  constructor(private store: Store) {}

  ngOnInit() {
    // Initialiser avec le montant actuel
    this.amountControl.setValue(this.currentAmount);

    // Écouter les changements avec debounce
    this.amountControl.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        const amount = value || 0;
        if (amount > 0 && this.selectedCredit) {
          // Déclencher la validation via le store
          this.store.dispatch(RecoveryActions.validateRecoveryAmount({
            amount,
            distributionId: this.selectedCredit.id
          }));
          this.amountChanged.emit(amount);
        }
      });

    // Écouter les résultats de validation du store
    this.store.select(RecoverySelectors.selectValidationResult)
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.isValid = result.isValid;
          this.validationMessage = result.message;
        }
      });

    // Validation initiale si un montant est déjà défini
    if (this.currentAmount > 0) {
      this.validateAmount(this.currentAmount);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private validateAmount(amount: number) {
    if (amount > 0 && this.selectedCredit) {
      this.store.dispatch(RecoveryActions.validateRecoveryAmount({
        amount,
        distributionId: this.selectedCredit.id
      }));
    }
  }

  onAmountInput(event: any) {
    const value = parseFloat(event.target.value) || 0;
    this.amountControl.setValue(value, { emitEvent: false });
    this.validateAmount(value);
    this.amountChanged.emit(value);
  }

  setMultipleAmount(multiplier: number) {
    const dailyPayment = this.selectedCredit.dailyPayment || 0;
    const amount = dailyPayment * multiplier;
    this.amountControl.setValue(amount);
  }

  setDailyAmount() {
    const dailyPayment = this.selectedCredit.dailyPayment || 0;
    this.amountControl.setValue(dailyPayment);
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount);
  }

  getExpectedAmount(): number {
    return this.selectedCredit.dailyPayment || 0;
  }

  // Vérifier si un multiple est disponible (ne dépasse pas le solde restant)
  isMultipleAvailable(multiplier: number): boolean {
    const dailyPayment = this.selectedCredit.dailyPayment || 0;
    const amount = dailyPayment * multiplier;
    const remainingAmount = this.selectedCredit.remainingAmount || 0;
    return amount <= remainingAmount;
  }

  // Calculer le montant maximum possible
  getMaxAmount(): number {
    return this.selectedCredit.remainingAmount || 0;
  }

  // Calculer le nombre maximum de multiples possibles
  getMaxMultiplier(): number {
    const dailyPayment = this.selectedCredit.dailyPayment || 0;
    const remainingAmount = this.selectedCredit.remainingAmount || 0;
    if (dailyPayment === 0) return 0;
    return Math.floor(remainingAmount / dailyPayment);
  }
}

