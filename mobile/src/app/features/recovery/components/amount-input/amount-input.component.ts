import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Distribution } from '../../../../models/distribution.model';
import * as RecoveryActions from '../../../../store/recovery/recovery.actions';
import * as RecoverySelectors from '../../../../store/recovery/recovery.selectors';

export interface MiseChip {
  num: number;
  late: boolean; // true si cette mise aurait dû être payée selon la date du jour
}

@Component({
  selector: 'app-amount-input',
  templateUrl: './amount-input.component.html',
  styleUrls: ['./amount-input.component.scss'],
  standalone: false
})
export class AmountInputComponent implements OnInit, OnDestroy, OnChanges {
  @Input() selectedCredit!: Distribution;
  @Input() currentAmount: number = 0;
  @Output() amountChanged = new EventEmitter<number>();

  private destroy$ = new Subject<void>();

  // Numéro de la dernière mise sélectionnée (la sélection va de paidCount+1 jusqu'à selectedUpTo)
  selectedUpTo: number | null = null;

  validationMessage: string = '';
  isValid: boolean = false;

  constructor(private store: Store) {}

  ngOnInit() {
    this.store.select(RecoverySelectors.selectValidationResult)
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        if (result) {
          this.isValid = result.isValid;
          this.validationMessage = result.message;
        }
      });

    if (this.currentAmount > 0) {
      this.syncSelectionFromAmount(this.currentAmount);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedCredit'] && !changes['selectedCredit'].firstChange) {
      this.selectedUpTo = null;
      this.validationMessage = '';
      this.isValid = false;
    }
    if (changes['currentAmount'] && changes['currentAmount'].currentValue === 0) {
      this.selectedUpTo = null;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Calculs ────────────────────────────────────────────────────────────────

  getExpectedAmount(): number {
    return this.selectedCredit?.dailyPayment || 0;
  }

  /**
   * Nombre de mises déjà payées : (totalPayé - avance) / miseJournalière
   */
  getPaidMisesCount(): number {
    const dailyPayment = this.getExpectedAmount();
    if (dailyPayment <= 0) return 0;
    const totalAmount = this.selectedCredit?.totalAmount || 0;
    const remainingAmount = this.selectedCredit?.remainingAmount || 0;
    const paidAmount = totalAmount - remainingAmount;
    const advance = (this.selectedCredit as any)?.advance || 0;
    const effectivePaid = paidAmount - advance;
    return Math.max(0, Math.floor(effectivePaid / dailyPayment));
  }

  /**
   * Nombre total de mises que représente le crédit
   */
  getTotalMisesCount(): number {
    const dailyPayment = this.getExpectedAmount();
    if (dailyPayment <= 0) return 0;
    const totalAmount = this.selectedCredit?.totalAmount || 0;
    return Math.ceil(totalAmount / dailyPayment);
  }

  /**
   * Nombre de mises attendues à ce jour depuis la date de début du crédit.
   * Ex : crédit démarré le 1er, aujourd'hui le 13 → 13 mises attendues.
   * On exclut les dimanches si le contrat ne prévoit pas de collecte ce jour-là
   * (actuellement : tous les jours calendaires, à adapter selon les règles métier).
   */
  getDueMisesCount(): number {
    const startDate = (this.selectedCredit as any)?.startDate
      || (this.selectedCredit as any)?.createdAt;
    if (!startDate) return 0;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Nombre de jours écoulés depuis le début (inclusif)
    const diffMs = today.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

    const total = this.getTotalMisesCount();
    return Math.min(Math.max(0, diffDays), total);
  }

  /**
   * Une mise est "en retard" si elle aurait dû être payée selon la date du jour
   * mais ne l'est pas encore (num > paidCount ET num <= dueCount).
   */
  isLate(num: number): boolean {
    const paid = this.getPaidMisesCount();
    const due = this.getDueMisesCount();
    return num > paid && num <= due;
  }

  /**
   * Génère les chips disponibles à sélectionner (mises non encore payées),
   * avec le flag `late` pour coloration.
   */
  getMiseChips(): MiseChip[] {
    const paid = this.getPaidMisesCount();
    const total = this.getTotalMisesCount();
    const chips: MiseChip[] = [];
    for (let i = paid + 1; i <= total; i++) {
      chips.push({ num: i, late: this.isLate(i) });
    }
    return chips;
  }

  /**
   * Nombre de mises en retard (pour affichage du badge)
   */
  getLateCount(): number {
    const paid = this.getPaidMisesCount();
    const due = this.getDueMisesCount();
    return Math.max(0, due - paid);
  }

  /**
   * Nombre de mises sélectionnées
   */
  getSelectedCount(): number {
    if (this.selectedUpTo === null) return 0;
    const paid = this.getPaidMisesCount();
    return this.selectedUpTo - paid;
  }

  /**
   * Montant total de la collecte en cours
   */
  getCollectAmount(): number {
    const calculatedAmount = this.getSelectedCount() * this.getExpectedAmount();
    const remainingAmount = this.selectedCredit?.remainingAmount || 0;
    
    if (remainingAmount > 0 && calculatedAmount > remainingAmount) {
      return remainingAmount;
    }
    
    return calculatedAmount;
  }

  // ─── États des chips ────────────────────────────────────────────────────────

  isSelected(num: number): boolean {
    return this.selectedUpTo === num;
  }

  isInRange(num: number): boolean {
    if (this.selectedUpTo === null) return false;
    const paid = this.getPaidMisesCount();
    return num > paid && num < this.selectedUpTo;
  }

  // ─── Interactions ───────────────────────────────────────────────────────────

  onChipClick(num: number): void {
    if (this.selectedUpTo === num) {
      this.selectedUpTo = null;
      this.emitAmount(0);
      return;
    }
    this.selectedUpTo = num;
    const amount = this.getCollectAmount();
    this.emitAmount(amount);
  }

  private emitAmount(amount: number): void {
    this.amountChanged.emit(amount);
    if (amount > 0 && this.selectedCredit) {
      this.store.dispatch(RecoveryActions.validateRecoveryAmount({
        amount,
        distributionId: this.selectedCredit.id
      }));
      this.store.dispatch(RecoveryActions.setRecoveryAmount({ amount }));
    } else {
      this.validationMessage = '';
      this.isValid = false;
    }
  }

  // ─── Utilitaires ────────────────────────────────────────────────────────────

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(amount));
  }

  private syncSelectionFromAmount(amount: number): void {
    const dailyPayment = this.getExpectedAmount();
    if (dailyPayment <= 0 || amount <= 0) return;
    const paid = this.getPaidMisesCount();
    const count = Math.ceil(amount / dailyPayment);
    if (count > 0) {
      this.selectedUpTo = paid + count;
    }
  }
}
