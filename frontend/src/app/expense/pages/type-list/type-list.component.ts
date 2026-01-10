import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpenseType } from '../../models/expense.model';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
    selector: 'app-expense-type-list',
    templateUrl: './type-list.component.html',
    styleUrls: ['./type-list.component.scss'],
    standalone: false
})
export class ExpenseTypeListComponent implements OnInit {
    displayedColumns: string[] = ['name', 'actions'];
    dataSource = new MatTableDataSource<ExpenseType>([]);
    totalElements = 0;
    pageSize = 10;
    pageIndex = 0;

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(
        private expenseService: ExpenseService,
        private router: Router,
        private snackBar: MatSnackBar,
        private alertService: AlertService
    ) { }

    ngOnInit(): void {
        this.loadTypes();
    }

    loadTypes(): void {
        this.expenseService.getPaginatedExpenseTypes(this.pageIndex, this.pageSize).subscribe({
            next: (response) => {
                this.dataSource.data = response.content;
                this.totalElements = response.page.totalElements;
            },
            error: (err) => {
                console.error('Error loading expense types', err);
                this.snackBar.open('Erreur lors du chargement des types de dépense', 'Fermer', { duration: 3000 });
            }
        });
    }

    onPageChange(event: any): void {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
        this.loadTypes();
    }

    addType(): void {
        this.router.navigate(['/expense/types/add']);
    }

    editType(type: ExpenseType): void {
        this.router.navigate(['/expense/types/edit', type.id]);
    }

    deleteType(type: ExpenseType): void {
        this.alertService.showConfirmation('Confirmation', `Êtes-vous sûr de vouloir supprimer le type "${type.name}" ?`).then((confirmed) => {
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
}
