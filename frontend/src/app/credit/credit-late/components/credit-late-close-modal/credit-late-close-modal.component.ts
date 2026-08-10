import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreditLateDTO } from '../../../models/credit-late.model';
import { RecoveryManagerService } from '../../../service/recovery-manager.service';
import { CreditCloseItemDto } from '../../../models/recovery-manager.model';
import { AlertService } from '../../../../shared/service/alert.service';

interface CloseItem {
  credit: CreditLateDTO;
  isPartial: boolean;
  amount: number;
  amountError?: string;
}

@Component({
  selector: 'app-credit-late-close-modal',
  templateUrl: './credit-late-close-modal.component.html',
  styleUrls: ['./credit-late-close-modal.component.scss'],
  standalone: false
})
export class CreditLateCloseModalComponent implements OnInit {
  items: CloseItem[] = [];
  isSubmitting = false;
  submitError: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<CreditLateCloseModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { credits: CreditLateDTO[] },
    private recoveryManagerService: RecoveryManagerService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.items = this.data.credits.map(credit => ({
      credit,
      isPartial: false,
      amount: credit.totalAmountRemaining
    }));
  }

  get isValid(): boolean {
    return this.items.every(item => {
      const remaining = item.credit.totalAmountRemaining || 0;
      if (remaining === 0) {
        return !item.isPartial && item.amount === 0;
      }
      return item.amount > 0 && item.amount <= remaining;
    });
  }

  get totalAmount(): number {
    return this.items.reduce((sum, item) => sum + item.amount, 0);
  }

  get totalCount(): number {
    return this.items.length;
  }

  get partialCount(): number {
    return this.items.filter(i => i.isPartial).length;
  }

  onPartialToggle(item: CloseItem): void {
    if (!item.isPartial) {
      item.amount = item.credit.totalAmountRemaining;
      item.amountError = undefined;
    }
  }

  validateAmount(item: CloseItem): void {
    const remaining = item.credit.totalAmountRemaining || 0;
    if (remaining === 0) {
      item.amountError = item.isPartial
        ? 'Clôture partielle impossible : restant net déjà à 0 (reliquat)'
        : undefined;
      return;
    }
    if (item.amount <= 0) {
      item.amountError = 'Le montant doit être supérieur à 0';
    } else if (item.amount > remaining) {
      item.amountError = `Le montant ne peut pas dépasser ${remaining.toLocaleString()} FCFA`;
    } else {
      item.amountError = undefined;
    }
  }

  onSubmit(): void {
    if (!this.isValid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.submitError = null;

    const closeItems: CreditCloseItemDto[] = this.items.map(item => ({
      creditId: item.credit.id,
      amount: item.amount,
      isPartial: item.isPartial
    }));

    this.recoveryManagerService.closeCredits(closeItems).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        const successes = data?.successes || [];
        const failures = data?.failures || [];
        if (successes.length > 0) {
          this.alertService.toastSuccess(
            `${successes.length} crédit(s) clôturé(s) avec succès`
          );
        }
        if (failures.length > 0) {
          const messages = failures
            .map((f: any) => `${f.creditReference || '#' + f.creditId}: ${f.errorMessage}`)
            .join('; ');
          this.submitError = `${failures.length} échec(s) — ${messages}`;
        }
        if (successes.length > 0) {
          this.dialogRef.close(true);
        } else {
          this.isSubmitting = false;
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.submitError = err.error?.message || 'Erreur lors de la clôture. Veuillez réessayer.';
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
