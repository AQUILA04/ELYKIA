import { Component } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { CreditLateDTO } from '../../../models/credit-late.model';

interface CreditFieldControlModalData {
  credit: CreditLateDTO;
}

@Component({
  selector: 'app-credit-field-control-modal',
  templateUrl: './credit-field-control-modal.component.html',
  styleUrls: ['./credit-field-control-modal.component.scss'],
  standalone: false
})
export class CreditFieldControlModalComponent {
  notebookTotalAmount: number | null = null;
  note: string = '';
  isSubmitting = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreditFieldControlModalData,
    private dialogRef: MatDialogRef<CreditFieldControlModalComponent>
  ) {}

  get isValid(): boolean {
    return this.notebookTotalAmount !== null && this.notebookTotalAmount >= 0;
  }

  close(): void {
    if (this.isSubmitting) return;
    this.dialogRef.close();
  }

  submit(): void {
    if (!this.isValid || this.notebookTotalAmount === null || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.dialogRef.close({
      notebookTotalAmount: this.notebookTotalAmount,
      note: this.note?.trim() || undefined
    });
  }
}
