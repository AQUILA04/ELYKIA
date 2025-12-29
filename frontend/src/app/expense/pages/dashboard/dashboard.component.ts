import { Component, OnInit } from '@angular/core';
import { ExpenseService } from '../../services/expense.service';
import { ExpenseKpi } from '../../models/expense.model';

@Component({
  selector: 'app-expense-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class ExpenseDashboardComponent implements OnInit {
  kpis: ExpenseKpi[] = [];

  constructor(private expenseService: ExpenseService) { }

  ngOnInit(): void {
    this.expenseService.getDashboardKpis().subscribe(data => {
      this.kpis = data;
    });
  }
}
