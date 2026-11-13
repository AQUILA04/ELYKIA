import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ExpenseService } from '../../services/expense.service';
import { Expense, ExpenseType } from '../../models/expense.model';
import { ExpenseCancelSelection } from '../expense-cancel.selection';

@Component({
  selector: 'app-expense-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss', '../expense-table.shared.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [ExpenseCancelSelection],
  standalone: false
})
export class ExpenseListComponent implements OnInit {
  expenses: Expense[] = [];
  expenseTypes: ExpenseType[] = [];
  isLoading = false;

  pageIndex = 0;
  pageSize = 10;
  totalElements = 0;

  selectedMonth: number | null = null;
  selectedTypeId: number | null = null;

  currentDate: Date = new Date();
  lastUpdate: Date = new Date();

  months: { index: number; name: string }[] = [];
  readonly reload = (): void => this.loadExpenses();

  constructor(
    private expenseService: ExpenseService,
    readonly cancel: ExpenseCancelSelection
  ) {}

  ngOnInit(): void {
    this.cancel.loadPermission();
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
        this.cancel.clear();
        this.totalElements = data.page?.totalElements || 0;
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

  get columnCount(): number {
    return this.cancel.canCancel ? 7 : 6;
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadExpenses();
  }
}
