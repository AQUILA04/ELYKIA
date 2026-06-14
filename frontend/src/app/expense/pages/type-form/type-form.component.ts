import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExpenseType } from '../../models/expense.model';

@Component({
  selector: 'app-expense-type-form',
  templateUrl: './type-form.component.html',
  styleUrls: ['./type-form.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ExpenseTypeFormComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  id: number | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.id = Number(idParam);
      this.isEditMode = true;
      this.loadType(this.id);
    }
  }

  loadType(id: number): void {
    this.loading = true;
    this.expenseService.getExpenseType(id).subscribe({
      next: (type) => {
        this.form.patchValue(type);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading type', err);
        this.snackBar.open('Erreur lors du chargement du type', 'Fermer', { duration: 3000 });
        this.router.navigate(['/expense/types']);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const type: ExpenseType = {
      ...this.form.value,
      id: this.id ?? undefined
    };

    const request = this.isEditMode
      ? this.expenseService.updateExpenseType(this.id!, type)
      : this.expenseService.createExpenseType(type);

    request.subscribe({
      next: () => {
        this.snackBar.open('Type de dépense enregistré avec succès', 'Fermer', { duration: 3000 });
        this.router.navigate(['/expense/types']);
      },
      error: (err) => {
        console.error('Error saving type', err);
        this.snackBar.open('Erreur lors de l\'enregistrement', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/expense/types']);
  }
}
