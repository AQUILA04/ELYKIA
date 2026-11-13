import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { NgxPermissionsService } from 'ngx-permissions';
import { ExpenseService } from '../../services/expense.service';
import { Expense, ExpenseType } from '../../models/expense.model';
import { AlertService } from 'src/app/shared/service/alert.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-expense-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ExpenseListComponent implements OnInit {
  expenses: Expense[] = [];
  expenseTypes: ExpenseType[] = [];
  isLoading = false;

  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  selectedMonth: number | null = null;
  selectedTypeId: number | null = null;
  canCancelExpense = false;
  selectedIds = new Set<number>();

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();

  months: { index: number; name: string }[] = [];

  constructor(
    private expenseService: ExpenseService,
    private router: Router,
    private alertService: AlertService,
    private snackBar: MatSnackBar,
    private permissionsService: NgxPermissionsService
  ) {}

  ngOnInit(): void {
    void this.permissionsService.hasPermission('ROLE_CANCEL_EXPENSE').then((allowed) => {
      this.canCancelExpense = !!allowed;
    });
    this.generateMonths();
    this.loadExpenseTypes();
    this.loadExpenses();
    setInterval(() => { this.currentDate = new Date(); }, 1000);
  }

  generateMonths(): void {
    const names = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const current = new Date().getMonth();
    for (let i = 0; i <= current; i++) {
      this.months.push({ index: i + 1, name: names[i] });
    }
  }

  loadExpenseTypes(): void {
    this.expenseService.getExpenseTypes().subscribe({
      next: (types) => { this.expenseTypes = types; },
      error: (err) => console.error(err)
    });
  }

  loadExpenses(): void {
    this.isLoading = true;
    this.expenseService.getExpenses(this.pageIndex, this.pageSize).subscribe({
      next: (data) => {
        this.expenses = data.content || [];
        this.selectedIds.clear();
        this.totalElements = data.page?.totalElements || 0;
        this.totalPages = data.page?.totalPages || 1;
        this.lastUpdate = new Date();
        this.isLoading = false;
      },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }

  onMonthFilter(event: any): void {
    const val = event.target.value;
    this.selectedMonth = val ? Number(val) : null;
    this.pageIndex = 0;
    this.loadExpenses();
  }

  onTypeFilter(event: any): void {
    const val = event.target.value;
    this.selectedTypeId = val ? Number(val) : null;
    this.pageIndex = 0;
    this.loadExpenses();
  }

  isCancelBlocked(expense: Expense): boolean {
    return !!expense.linkedToRemittance || !!expense.accounted;
  }

  cancelTooltip(expense: Expense): string {
    if (!this.isCancelBlocked(expense)) {
      return 'Annuler';
    }
    if (expense.accounted) {
      return 'Dépense comptabilisée — suppression impossible';
    }
    return 'Déjà associée à une remise — annulation impossible';
  }

  get selectableExpenses(): Expense[] {
    return this.expenses.filter((expense) => expense.id != null && !this.isCancelBlocked(expense));
  }

  get columnCount(): number {
    return this.canCancelExpense ? 7 : 6;
  }

  isSelected(id: number | undefined): boolean {
    return id != null && this.selectedIds.has(id);
  }

  toggleSelection(expense: Expense): void {
    if (expense.id == null || this.isCancelBlocked(expense)) {
      return;
    }
    if (this.selectedIds.has(expense.id)) {
      this.selectedIds.delete(expense.id);
    } else {
      this.selectedIds.add(expense.id);
    }
  }

  get isAllSelectableSelected(): boolean {
    return this.selectableExpenses.length > 0
      && this.selectableExpenses.every((expense) => this.selectedIds.has(expense.id!));
  }

  toggleAllSelection(): void {
    if (this.isAllSelectableSelected) {
      this.selectableExpenses.forEach((expense) => this.selectedIds.delete(expense.id!));
      return;
    }
    this.selectableExpenses.forEach((expense) => this.selectedIds.add(expense.id!));
  }

  deleteExpense(expense: Expense): void {
    if (this.isCancelBlocked(expense) || expense.id == null) {
      return;
    }
    this.alertService.showDeleteConfirmation('Supprimer cette dépense ?').then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.expenseService.deleteExpense(expense.id!).subscribe({
        next: () => {
          this.snackBar.open('Dépense supprimée', 'Fermer', { duration: 3000 });
          this.loadExpenses();
        },
        error: (err) => this.alertService.showError(this.expenseErrorMessage(err))
      });
    });
  }

  cancelSelected(): void {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) {
      return;
    }
    const text = ids.length === 1
      ? 'Supprimer la dépense sélectionnée ?'
      : `Supprimer les ${ids.length} dépenses sélectionnées ?`;
    this.alertService.showDeleteConfirmation(text).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.expenseService.cancelExpenses(ids).subscribe({
        next: () => {
          this.snackBar.open(
            ids.length === 1 ? 'Dépense supprimée' : 'Dépenses supprimées',
            'Fermer',
            { duration: 3000 }
          );
          this.loadExpenses();
        },
        error: (err) => this.alertService.showError(this.expenseErrorMessage(err))
      });
    });
  }

  private expenseErrorMessage(err: { error?: { message?: string } }): string {
    return err?.error?.message || 'Impossible d\'annuler cette dépense.';
  }

  changePage(delta: number): void {
    this.pageIndex = Math.max(0, Math.min(this.totalPages - 1, this.pageIndex + delta));
    this.loadExpenses();
  }

  goPage(index: number): void {
    this.pageIndex = index;
    this.loadExpenses();
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getPaginationInfo(): string {
    if (this.totalElements === 0) return '0 résultat';
    const start = this.pageIndex * this.pageSize + 1;
    const end = Math.min((this.pageIndex + 1) * this.pageSize, this.totalElements);
    return `${start}–${end} sur ${this.totalElements}`;
  }
}
