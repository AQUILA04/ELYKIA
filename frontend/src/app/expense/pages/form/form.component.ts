import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ExpenseService } from '../../services/expense.service';
import { Expense, ExpenseType } from '../../models/expense.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-expense-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
  standalone: false
})
export class ExpenseFormComponent implements OnInit {
  expenseForm: FormGroup;
  isEditMode = false;
  expenseId?: number;
  expenseTypes: ExpenseType[] = [];

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.expenseForm = this.fb.group({
      expenseTypeId: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0)]],
      expenseDate: [new Date(), Validators.required],
      description: [''],
      reference: ['']
    });
  }

  ngOnInit(): void {
    this.loadExpenseTypes();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.expenseId = +params['id'];
        this.loadExpense(this.expenseId);
      }
    });
  }

  loadExpenseTypes() {
    this.expenseService.getExpenseTypes().subscribe(data => {
      this.expenseTypes = data;
    });
  }

  loadExpense(id: number) {
    this.expenseService.getExpense(id).subscribe(data => {
      this.expenseForm.patchValue({
        expenseTypeId: data.expenseTypeId,
        amount: data.amount,
        expenseDate: new Date(data.expenseDate), // Ensure date object
        description: data.description,
        reference: data.reference
      });
    });
  }

  onSubmit() {
    if (this.expenseForm.valid) {
      const expenseData: Expense = {
        ...this.expenseForm.value,
        id: this.expenseId
        // Handle date conversion if needed, Angular Material Datepicker usually returns Date object
      };

      if (this.isEditMode && this.expenseId) {
        this.expenseService.updateExpense(this.expenseId, expenseData).subscribe(() => {
          this.snackBar.open('Dépense modifiée avec succès', 'Fermer', { duration: 3000 });
          this.router.navigate(['/expense/list']);
        });
      } else {
        this.expenseService.createExpense(expenseData).subscribe(() => {
          this.snackBar.open('Dépense créée avec succès', 'Fermer', { duration: 3000 });
          this.router.navigate(['/expense/list']);
        });
      }
    }
  }
}
