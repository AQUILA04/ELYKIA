import { Component, OnInit, ViewChild } from '@angular/core';
import { ExpenseService } from '../../services/expense.service';
import { Expense } from '../../models/expense.model';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-expense-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  standalone: false
})
export class ExpenseListComponent implements OnInit {
  displayedColumns: string[] = ['date', 'type', 'amount', 'description', 'actions'];
  dataSource = new MatTableDataSource<Expense>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private expenseService: ExpenseService, private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.loadExpenses();
  }

  loadExpenses() {
    this.expenseService.getExpenses(0, 100).subscribe(data => {
      // Assuming API returns a page content or list. If it is Page<T>, we need to adjust.
      // Based on service it returns res.data. If res.data is Page object (content, totalElements), we extract content.
      // If the service logic was: return this.http.get... map(res => res.data), and backend returns Page<ExpenseDto> as data.
      // Then data.content is the list.
      if (data.content) {
        this.dataSource.data = data.content;
      } else if (Array.isArray(data)) {
        this.dataSource.data = data;
      } else {
        // Fallback if structure is different
        this.dataSource.data = [];
      }
      this.dataSource.paginator = this.paginator;
    });
  }

  deleteExpense(expense: Expense) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      this.expenseService.deleteExpense(expense.id!).subscribe(() => {
        this.snackBar.open('Dépense supprimée', 'Fermer', { duration: 3000 });
        this.loadExpenses();
      });
    }
  }
}
