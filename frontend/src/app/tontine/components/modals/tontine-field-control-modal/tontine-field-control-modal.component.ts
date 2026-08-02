import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TontineService } from '../../../services/tontine.service';
import { AlertService } from 'src/app/shared/service/alert.service';

export interface TontineFieldControlMonthOption {
  year: number;
  /** Index JS Date.getMonth() (Fév = 1 … Nov = 10). */
  jsMonth: number;
  monthName: string;
  totalAmount: number;
}

export interface TontineFieldControlMonthRow {
  year: number;
  /** Mois calendaire 1–12. */
  calendarMonth: number;
  monthName: string;
  systemAmount: number;
  selected: boolean;
  notebookAmount: number | null;
}

export interface TontineFieldControlModalData {
  memberId: number;
  memberName: string;
  monthlySummaries: TontineFieldControlMonthOption[];
}

@Component({
  selector: 'app-tontine-field-control-modal',
  templateUrl: './tontine-field-control-modal.component.html',
  styleUrls: ['./tontine-field-control-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class TontineFieldControlModalComponent implements OnInit {
  note = '';
  isSubmitting = false;
  rows: TontineFieldControlMonthRow[] = [];
  private requestReference = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TontineFieldControlModalData,
    private dialogRef: MatDialogRef<TontineFieldControlModalComponent>,
    private tontineService: TontineService,
    private alertService: AlertService
  ) {
    this.rows = (data.monthlySummaries || []).map(summary => ({
      year: summary.year,
      calendarMonth: summary.jsMonth + 1,
      monthName: summary.monthName,
      systemAmount: summary.totalAmount || 0,
      selected: false,
      notebookAmount: null
    }));
  }

  ngOnInit(): void {
    this.requestReference = this.generateReference();
  }

  get selectedRows(): TontineFieldControlMonthRow[] {
    return this.rows.filter(r => r.selected);
  }

  get isValid(): boolean {
    const selected = this.selectedRows;
    if (selected.length === 0) {
      return false;
    }
    return selected.every(r => r.notebookAmount !== null && r.notebookAmount >= 0);
  }

  toggleRow(row: TontineFieldControlMonthRow): void {
    if (this.isSubmitting) {
      return;
    }
    row.selected = !row.selected;
    if (!row.selected) {
      row.notebookAmount = null;
    } else if (row.notebookAmount === null) {
      row.notebookAmount = row.systemAmount;
    }
  }

  close(): void {
    if (this.isSubmitting) {
      return;
    }
    this.dialogRef.close();
  }

  submit(): void {
    if (!this.isValid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.tontineService.createMemberFieldControl(this.data.memberId, {
      reference: this.requestReference,
      months: this.selectedRows.map(r => ({
        year: r.year,
        month: r.calendarMonth,
        notebookAmount: r.notebookAmount as number
      })),
      note: this.note?.trim() || undefined
    }).subscribe({
      next: () => {
        this.alertService.showSuccess('Contrôle terrain enregistré avec succès.');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.alertService.showError(
          error?.error?.message || 'Impossible d’enregistrer le contrôle terrain.'
        );
      }
    });
  }

  private generateReference(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `TMFC-${crypto.randomUUID()}`;
    }
    return `TMFC-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
