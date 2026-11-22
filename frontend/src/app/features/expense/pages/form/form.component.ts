import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ExpenseService } from '../../services/expense.service';
import { Expense, ExpenseType } from '../../models/expense.model';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-expense-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ExpenseFormComponent implements OnInit {
  expenseForm: FormGroup;
  isEditMode = false;
  isAccounted = false;
  expenseId?: number;
  expenseTypes: ExpenseType[] = [];

  constructor(
    private fb: FormBuilder,
    private expenseService: ExpenseService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private snackBar: MatSnackBar
  ) {
    this.expenseForm = this.fb.group({
      expenseTypeId: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0)]],
      expenseDate: ['', Validators.required],
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
      const dateStr = data.expenseDate
        ? new Date(data.expenseDate).toISOString().split('T')[0]
        : '';
      this.expenseForm.patchValue({
        expenseTypeId: data.expenseTypeId,
        amount: data.amount,
        expenseDate: dateStr,
        description: data.description,
        reference: data.reference
      });
      if (data.accounted) {
        this.isAccounted = true;
        this.expenseForm.disable();
      }
    });
  }

  onSubmit() {
    if (this.expenseForm.valid) {
      const expenseData: Expense = {
        ...this.expenseForm.value,
        id: this.expenseId
      };
      if (this.isEditMode && this.expenseId) {
        this.expenseService.updateExpense(this.expenseId, expenseData).subscribe(() => {
          this.snackBar.open('Dépense modifiée avec succès', 'Fermer', { duration: 3000 });
          this.location.back();
        });
      } else {
        this.expenseService.createExpense(expenseData).subscribe(() => {
          this.snackBar.open('Dépense créée avec succès', 'Fermer', { duration: 3000 });
          this.location.back();
        });
      }
    }
  }

  goBack(): void {
    this.location.back();
  }
}
