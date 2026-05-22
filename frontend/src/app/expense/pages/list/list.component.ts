import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
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

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();

  months: { index: number; name: string }[] = [];

  constructor(
    private expenseService: ExpenseService,
    private router: Router,
    private alertService: AlertService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
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

  deleteExpense(expense: Expense): void {
    this.alertService.showConfirmation('Confirmation', 'Supprimer cette dépense ?').then((confirmed) => {
      if (confirmed) {
        this.expenseService.deleteExpense(expense.id!).subscribe({
          next: () => {
            this.snackBar.open('Dépense supprimée', 'Fermer', { duration: 3000 });
            this.loadExpenses();
          },
          error: (err) => console.error(err)
        });
      }
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
}
