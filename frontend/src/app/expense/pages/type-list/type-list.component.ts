import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { ExpenseService } from '../../services/expense.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpenseType } from '../../models/expense.model';
import { AlertService } from 'src/app/shared/service/alert.service';

interface ExpenseTypeListState {
  pageIndex: number;
  pageSize: number;
}

@Component({
  selector: 'app-expense-type-list',
  templateUrl: './type-list.component.html',
  styleUrls: ['./type-list.component.scss', '../expense-table.shared.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ExpenseTypeListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'expenseTypeListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  types: ExpenseType[] = [];
  totalElements = 0;
  totalPages = 0;
  pageSize = 10;
  pageIndex = 0;
  isLoading = false;

  currentDate = new Date();
  lastUpdate = new Date();

  constructor(
    private expenseService: ExpenseService,
    private router: Router,
    private snackBar: MatSnackBar,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.restoreState();
    this.loadTypes();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.saveState();
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  loadTypes(): void {
    this.isLoading = true;
    this.expenseService.getPaginatedExpenseTypes(this.pageIndex, this.pageSize).subscribe({
      next: (response) => {
        this.types = response.content;
        this.totalElements = response.page?.totalElements ?? 0;
        this.totalPages = response.page?.totalPages ?? 1;
        this.lastUpdate = new Date();
        this.isLoading = false;
        this.saveState();
      },
      error: (err) => {
        console.error('Error loading expense types', err);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des types de dépense', 'Fermer', { duration: 3000 });
      }
    });
  }

  refresh(): void {
    this.loadTypes();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTypes();
  }

  addType(): void {
    this.saveState();
    this.router.navigate(['/expense/types/add']);
  }

  editType(type: ExpenseType): void {
    this.saveState();
    this.router.navigate(['/expense/types/edit', type.id]);
  }

  deleteType(type: ExpenseType): void {
    this.alertService.showConfirmation('Confirmation', `Êtes-vous sûr de vouloir supprimer le type « ${type.name} » ?`).then((confirmed) => {
      if (confirmed) {
        this.expenseService.deleteExpenseType(type.id!).subscribe({
          next: () => {
            this.snackBar.open('Type de dépense supprimé avec succès', 'Fermer', { duration: 3000 });
            this.loadTypes();
          },
          error: (err) => {
            console.error('Error deleting expense type', err);
            this.snackBar.open('Erreur lors de la suppression du type', 'Fermer', { duration: 3000 });
          }
        });
      }
    });
  }

  private saveState(): void {
    const state: ExpenseTypeListState = {
      pageIndex: this.pageIndex,
      pageSize: this.pageSize
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.STATE_KEY);
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as ExpenseTypeListState;
      this.pageIndex = state.pageIndex ?? 0;
      this.pageSize = state.pageSize ?? 10;
    } catch (e) {
      console.error('Erreur restauration état liste types dépense', e);
    }
  }
}
