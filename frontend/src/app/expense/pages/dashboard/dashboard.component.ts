import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { NgxPermissionsService } from 'ngx-permissions';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpenseService } from '../../services/expense.service';
import { Expense, ExpenseKpi } from '../../models/expense.model';
import { AuthService } from 'src/app/auth/service/auth.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { KpiFinancierPermissions } from 'src/app/shared/constants/kpi-financier-permission.constant';

@Component({
  selector: 'app-expense-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ExpenseDashboardComponent implements OnInit {
  kpis: ExpenseKpi[] = [];
  recentExpenses: Expense[] = [];
  isLoading = false;

  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();
  canCancelExpense = false;
  selectedIds = new Set<number>();

  // Modal
  selectedExpense: Expense | null = null;

  constructor(
    private expenseService: ExpenseService,
    private router: Router,
    private authService: AuthService,
    private alertService: AlertService,
    private snackBar: MatSnackBar,
    private permissionsService: NgxPermissionsService
  ) {}

  ngOnInit(): void {
    void this.permissionsService.hasPermission('ROLE_CANCEL_EXPENSE').then((allowed) => {
      this.canCancelExpense = !!allowed;
    }).catch(() => undefined);
    this.loadData();
    setInterval(() => { this.currentDate = new Date(); }, 1000);
  }

  loadData(): void {
    this.isLoading = true;
    void this.authService.hasPermission(KpiFinancierPermissions.Depense).then((allowed) => {
      if (!allowed) {
        this.kpis = [];
        return;
      }
      this.expenseService.getDashboardKpis().subscribe({
        next: (data) => { this.kpis = data; this.lastUpdate = new Date(); },
        error: (err) => console.error(err)
      });
    });
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.isLoading = true;
    this.expenseService.getExpenses(this.pageIndex, this.pageSize).subscribe({
      next: (data) => {
        this.recentExpenses = data.content || [];
        this.selectedIds.clear();
        this.totalElements = data.page?.totalElements || 0;
        this.lastUpdate = new Date();
        this.isLoading = false;
      },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadExpenses();
  }

  openDetail(expense: Expense): void { this.selectedExpense = expense; }
  closeDetail(): void { this.selectedExpense = null; }

  get columnCount(): number {
    return this.canCancelExpense ? 5 : 4;
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
    return this.recentExpenses.filter((expense) => expense.id != null && !this.isCancelBlocked(expense));
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
    void this.alertService.showDeleteConfirmation('Supprimer cette dépense ?').then((confirmed) => {
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
    }).catch(() => undefined);
  }

  cancelSelected(): void {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) {
      return;
    }
    const text = ids.length === 1
      ? 'Supprimer la dépense sélectionnée ?'
      : `Supprimer les ${ids.length} dépenses sélectionnées ?`;
    void this.alertService.showDeleteConfirmation(text).then((confirmed) => {
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
    }).catch(() => undefined);
  }

  private expenseErrorMessage(err: { error?: { message?: string } }): string {
    return err?.error?.message || 'Impossible d\'annuler cette dépense.';
  }

  goToList()  { this.router.navigate(['/expense/list']); }
  goToAdd()   { this.router.navigate(['/expense/add']); }
  goToTypes() { this.router.navigate(['/expense/types']); }
}
