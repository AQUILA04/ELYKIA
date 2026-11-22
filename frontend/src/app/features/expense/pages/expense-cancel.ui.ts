import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Expense } from '../models/expense.model';
import { ExpenseCancelSelection } from './expense-cancel.selection';

@Component({
  selector: 'app-expense-cancel-box',
  template: `
    <input type="checkbox"
           [attr.aria-label]="label"
           [checked]="expense ? selection.isSelected(expense.id) : selection.isAllSelected(rows)"
           [disabled]="expense ? selection.isBlocked(expense) : selection.selectable(rows).length === 0"
           (change)="toggle()">
  `,
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ExpenseCancelBoxComponent {
  @Input({ required: true }) selection!: ExpenseCancelSelection;
  @Input() expense?: Expense;
  @Input() rows: readonly Expense[] = [];
  @Input() label = 'Sélectionner';

  toggle(): void {
    if (this.expense) {
      this.selection.toggle(this.expense);
      return;
    }
    this.selection.toggleAll(this.rows);
  }
}

@Component({
  selector: 'app-expense-cancel-button',
  template: `
    <button class="btn-delete" type="button"
            [disabled]="selection.isBlocked(expense)"
            [attr.aria-label]="selection.tooltip(expense)"
            [matTooltip]="selection.tooltip(expense)"
            (click)="remove()">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </svg>
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ExpenseCancelButtonComponent {
  @Input({ required: true }) selection!: ExpenseCancelSelection;
  @Input({ required: true }) expense!: Expense;
  @Output() cancelled = new EventEmitter<void>();

  remove(): void {
    this.selection.deleteOne(this.expense, () => this.cancelled.emit());
  }
}

@Component({
  selector: 'app-expense-paginator',
  template: `
    <div class="pagination">
      <mat-paginator
        [length]="length"
        [pageSize]="pageSize"
        [pageIndex]="pageIndex"
        [pageSizeOptions]="[10, 25, 50]"
        (page)="page.emit($event)"
        showFirstLastButtons>
      </mat-paginator>
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class ExpensePaginatorComponent {
  @Input() length = 0;
  @Input() pageSize = 10;
  @Input() pageIndex = 0;
  @Output() page = new EventEmitter<PageEvent>();
}
