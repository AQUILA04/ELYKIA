import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { Expense, ExpenseKpi } from '../../models/expense.model';

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
  totalPages = 0;

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();

  // Modal
  selectedExpense: Expense | null = null;

  constructor(
    private expenseService: ExpenseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    setInterval(() => { this.currentDate = new Date(); }, 1000);
  }

  loadData(): void {
    this.isLoading = true;
    this.expenseService.getDashboardKpis().subscribe({
      next: (data) => { this.kpis = data; this.lastUpdate = new Date(); },
      error: (err) => console.error(err)
    });
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.isLoading = true;
    this.expenseService.getExpenses(this.pageIndex, this.pageSize).subscribe({
      next: (data) => {
        this.recentExpenses = data.content || [];
        this.totalElements = data.page?.totalElements || 0;
        this.totalPages = data.page?.totalPages || 1;
        this.lastUpdate = new Date();
        this.isLoading = false;
      },
      error: (err) => { console.error(err); this.isLoading = false; }
    });
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

  openDetail(expense: Expense): void { this.selectedExpense = expense; }
  closeDetail(): void { this.selectedExpense = null; }

  goToList()  { this.router.navigate(['/expense/list']); }
  goToAdd()   { this.router.navigate(['/expense/add']); }
  goToTypes() { this.router.navigate(['/expense/types']); }
}
