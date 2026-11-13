import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { ExpenseService } from '../../services/expense.service';
import { Expense, ExpenseKpi } from '../../models/expense.model';
import { AuthService } from 'src/app/auth/service/auth.service';
import { KpiFinancierPermissions } from 'src/app/shared/constants/kpi-financier-permission.constant';
import { ExpenseCancelSelection } from '../expense-cancel.selection';

@Component({
  selector: 'app-expense-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss', '../expense-table.shared.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [ExpenseCancelSelection],
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

  // Modal
  selectedExpense: Expense | null = null;
  readonly reload = (): void => this.loadExpenses();

  constructor(
    private expenseService: ExpenseService,
    private router: Router,
    private authService: AuthService,
    readonly cancel: ExpenseCancelSelection
  ) {}

  ngOnInit(): void {
    this.cancel.loadPermission();
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
        this.cancel.clear();
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
    return this.cancel.canCancel ? 5 : 4;
  }

  goToList()  { this.router.navigate(['/expense/list']); }
  goToAdd()   { this.router.navigate(['/expense/add']); }
  goToTypes() { this.router.navigate(['/expense/types']); }
}
