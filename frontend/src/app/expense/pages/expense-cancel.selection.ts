import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxPermissionsService } from 'ngx-permissions';
import { AlertService } from 'src/app/shared/service/alert.service';
import { Expense } from '../models/expense.model';
import { ExpenseService } from '../services/expense.service';

/** Sélection et annulation partagées par le tableau de bord et la liste. */
@Injectable()
export class ExpenseCancelSelection {
  canCancel = false;
  readonly selectedIds = new Set<number>();

  constructor(
    private readonly permissionsService: NgxPermissionsService,
    private readonly expenseService: ExpenseService,
    private readonly alertService: AlertService,
    private readonly snackBar: MatSnackBar
  ) {}

  loadPermission(): void {
    void this.permissionsService.hasPermission('ROLE_CANCEL_EXPENSE').then((allowed) => {
      this.canCancel = !!allowed;
    }).catch(() => undefined);
  }

  clear(): void {
    this.selectedIds.clear();
  }

  isBlocked(expense: Expense): boolean {
    return !!expense.linkedToRemittance || !!expense.accounted;
  }

  tooltip(expense: Expense): string {
    if (!this.isBlocked(expense)) {
      return 'Annuler';
    }
    if (expense.accounted) {
      return 'Dépense comptabilisée — suppression impossible';
    }
    return 'Déjà associée à une remise — annulation impossible';
  }

  selectable(rows: readonly Expense[]): Expense[] {
    return rows.filter((expense) => expense.id != null && !this.isBlocked(expense));
  }

  isSelected(id: number | undefined): boolean {
    return id != null && this.selectedIds.has(id);
  }

  toggle(expense: Expense): void {
    if (expense.id == null || this.isBlocked(expense)) {
      return;
    }
    if (this.selectedIds.has(expense.id)) {
      this.selectedIds.delete(expense.id);
    } else {
      this.selectedIds.add(expense.id);
    }
  }

  isAllSelected(rows: readonly Expense[]): boolean {
    const selectable = this.selectable(rows);
    return selectable.length > 0 && selectable.every((expense) => this.selectedIds.has(expense.id!));
  }

  toggleAll(rows: readonly Expense[]): void {
    const selectable = this.selectable(rows);
    if (this.isAllSelected(rows)) {
      selectable.forEach((expense) => this.selectedIds.delete(expense.id!));
      return;
    }
    selectable.forEach((expense) => this.selectedIds.add(expense.id!));
  }

  deleteOne(expense: Expense, reload: () => void): void {
    if (this.isBlocked(expense) || expense.id == null) {
      return;
    }
    this.confirm('Supprimer cette dépense ?', () => {
      this.expenseService.deleteExpense(expense.id!).subscribe({
        next: () => this.afterDelete(1, reload),
        error: (err) => this.alertService.showError(this.errorMessage(err))
      });
    });
  }

  deleteSelected(reload: () => void): void {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) {
      return;
    }
    const text = ids.length === 1
      ? 'Supprimer la dépense sélectionnée ?'
      : `Supprimer les ${ids.length} dépenses sélectionnées ?`;
    this.confirm(text, () => {
      this.expenseService.cancelExpenses(ids).subscribe({
        next: () => this.afterDelete(ids.length, reload),
        error: (err) => this.alertService.showError(this.errorMessage(err))
      });
    });
  }

  private confirm(text: string, onYes: () => void): void {
    void this.alertService.showDeleteConfirmation(text).then((confirmed) => {
      if (confirmed) {
        onYes();
      }
    }).catch(() => undefined);
  }

  private afterDelete(count: number, reload: () => void): void {
    this.snackBar.open(count === 1 ? 'Dépense supprimée' : 'Dépenses supprimées', 'Fermer', { duration: 3000 });
    reload();
  }

  private errorMessage(err: { error?: { message?: string } }): string {
    return err?.error?.message || 'Impossible d\'annuler cette dépense.';
  }
}
