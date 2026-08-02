import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreditLateDTO } from '../../../models/credit-late.model';
import { CreditService } from '../../../service/credit.service';
import { AlertService } from 'src/app/shared/service/alert.service';

interface CreditFieldControlModalData {
  credit: CreditLateDTO;
}

@Component({
  selector: 'app-credit-field-control-modal',
  templateUrl: './credit-field-control-modal.component.html',
  styleUrls: ['./credit-field-control-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CreditFieldControlModalComponent implements OnInit {
  notebookTotalAmount: number | null = null;
  note: string = '';
  isSubmitting = false;
  private requestReference = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: CreditFieldControlModalData,
    private dialogRef: MatDialogRef<CreditFieldControlModalComponent>,
    private creditService: CreditService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.requestReference = this.generateReference();
  }

  get isValid(): boolean {
    return this.notebookTotalAmount !== null && this.notebookTotalAmount >= 0;
  }

  close(): void {
    if (this.isSubmitting) {
      return;
    }
    this.dialogRef.close();
  }

  submit(): void {
    if (!this.isValid || this.notebookTotalAmount === null || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.creditService.createFieldControl(this.data.credit.id, {
      reference: this.requestReference,
      notebookTotalAmount: this.notebookTotalAmount,
      note: this.note?.trim() || undefined
    }).subscribe({
      next: () => {
        this.alertService.showSuccess('Contrôle terrain enregistré avec succès.');
        this.dialogRef.close(true);
      },
      error: (error) => {
        console.error(error);
        this.isSubmitting = false;
        this.alertService.showError(
          error?.error?.message || 'Impossible d’enregistrer le contrôle terrain.'
        );
      }
    });
  }

  private generateReference(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `CFC-${crypto.randomUUID()}`;
    }
    return `CFC-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
