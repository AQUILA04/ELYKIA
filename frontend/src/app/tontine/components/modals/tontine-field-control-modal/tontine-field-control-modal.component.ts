import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TontineService } from '../../../services/tontine.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { UserService } from 'src/app/user/service/user.service';
import { TontineFieldControlCollectorOption } from '../../../models/tontine-member-field-control.model';
import { TontineMemberAmountHistory } from '../../../types/tontine.types';
import { getApplicableAmountForDate } from '../../../utils/tontine-amount-history.util';

export interface TontineFieldControlPromoter {
  username: string;
  label: string;
}

export interface TontineFieldControlMonthRow {
  year: number;
  /** Mois calendaire 1–12. */
  calendarMonth: number;
  monthName: string;
  commercialUsername: string;
  systemAmount: number;
  applicableDailyAmount: number;
  declaredDailyAmount: number | null;
  selected: boolean;
  notebookAmount: number | null;
}

export interface TontineFieldControlCollectorBlock {
  commercialUsername: string;
  currentCollector: boolean;
  totalAmount: number;
  rows: TontineFieldControlMonthRow[];
}

export interface TontineFieldControlModalData {
  memberId: number;
  memberName: string;
  collectors: TontineFieldControlCollectorOption[];
  amountHistory?: TontineMemberAmountHistory[];
  memberAmount?: number;
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
  blocks: TontineFieldControlCollectorBlock[] = [];
  promoters: TontineFieldControlPromoter[] = [];
  private requestReference = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TontineFieldControlModalData,
    private dialogRef: MatDialogRef<TontineFieldControlModalComponent>,
    private tontineService: TontineService,
    private alertService: AlertService,
    private userService: UserService
  ) {
    const history = data.amountHistory || [];
    const fallback = data.memberAmount || 0;
    this.blocks = (data.collectors || []).map(collector => ({
      commercialUsername: collector.commercialUsername,
      currentCollector: collector.currentCollector === true,
      totalAmount: collector.totalAmount || 0,
      rows: (collector.months || []).map(summary => {
        const calendarMonth = summary.jsMonth + 1;
        const applicable = summary.dailyAmount != null
          ? summary.dailyAmount
          : this.applicableMise(history, fallback, summary.year, calendarMonth);
        return {
          year: summary.year,
          calendarMonth,
          monthName: summary.monthName,
          commercialUsername: collector.commercialUsername,
          systemAmount: summary.totalAmount || 0,
          applicableDailyAmount: applicable,
          declaredDailyAmount: applicable,
          selected: false,
          notebookAmount: null
        };
      })
    }));
  }

  ngOnInit(): void {
    this.requestReference = this.generateReference();
    this.userService.getAllPromoters().subscribe({
      next: promoters => {
        this.promoters = (promoters || [])
          .filter(promoter => !!promoter?.username)
          .map(promoter => ({
            username: promoter.username,
            label: [promoter.firstname, promoter.lastname].filter(Boolean).join(' ').trim() || promoter.username
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
      },
      error: () => {
        this.promoters = [];
      }
    });
  }

  get selectedRows(): TontineFieldControlMonthRow[] {
    return this.blocks.flatMap(b => b.rows.filter(r => r.selected));
  }

  get isValid(): boolean {
    const selected = this.selectedRows;
    if (selected.length === 0) {
      return false;
    }
    return selected.every(r =>
      !!r.commercialUsername
      && r.notebookAmount !== null
      && r.notebookAmount >= 0
      && (!this.canEditAttribution(r) || (r.declaredDailyAmount != null && r.declaredDailyAmount > 0)));
  }

  blockSelected(block: TontineFieldControlCollectorBlock): TontineFieldControlMonthRow[] {
    return block.rows.filter(r => r.selected);
  }

  blockDifference(block: TontineFieldControlCollectorBlock): number {
    return this.blockSelected(block).reduce(
      (sum, r) => sum + ((r.notebookAmount || 0) - (r.systemAmount || 0)),
      0
    );
  }

  canEditAttribution(row: TontineFieldControlMonthRow): boolean {
    return row.systemAmount <= 0 && !this.monthCollectedElsewhere(row);
  }

  promotersFor(row: TontineFieldControlMonthRow): TontineFieldControlPromoter[] {
    const options = [...this.promoters];
    if (row.commercialUsername && !options.some(option =>
      option.username.toLowerCase() === row.commercialUsername.toLowerCase())) {
      options.unshift({ username: row.commercialUsername, label: row.commercialUsername });
    }
    return options;
  }

  toggleRow(row: TontineFieldControlMonthRow): void {
    if (this.isSubmitting || (this.monthCollectedElsewhere(row) && !row.selected)) {
      return;
    }
    row.selected = !row.selected;
    if (!row.selected) {
      row.notebookAmount = null;
      row.commercialUsername = this.blockOf(row)?.commercialUsername || row.commercialUsername;
      row.declaredDailyAmount = row.applicableDailyAmount;
      return;
    }
    if (row.notebookAmount === null) {
      row.notebookAmount = row.systemAmount;
    }
    this.releaseEmptyMonth(row);
  }

  onCommercialChange(row: TontineFieldControlMonthRow, username: string): void {
    row.commercialUsername = username;
    this.releaseEmptyMonth(row);
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
        commercialUsername: r.commercialUsername,
        notebookAmount: r.notebookAmount as number,
        declaredDailyAmount: this.stakeToSend(r)
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

  private stakeToSend(row: TontineFieldControlMonthRow): number | undefined {
    if (!this.canEditAttribution(row) || row.declaredDailyAmount == null) {
      return undefined;
    }
    if (Math.abs(row.declaredDailyAmount - row.applicableDailyAmount) < 0.0001) {
      return undefined;
    }
    return row.declaredDailyAmount;
  }

  monthCollectedElsewhere(row: TontineFieldControlMonthRow): boolean {
    if (row.systemAmount > 0) {
      return false;
    }
    return this.blocks.some(block => block.rows.some(candidate =>
      candidate !== row
      && candidate.year === row.year
      && candidate.calendarMonth === row.calendarMonth
      && candidate.systemAmount > 0));
  }

  private releaseEmptyMonth(row: TontineFieldControlMonthRow): void {
    if (row.systemAmount > 0) {
      return;
    }
    for (const block of this.blocks) {
      for (const candidate of block.rows) {
        if (candidate === row || !candidate.selected || candidate.systemAmount > 0) {
          continue;
        }
        if (candidate.year === row.year && candidate.calendarMonth === row.calendarMonth) {
          candidate.selected = false;
          candidate.notebookAmount = null;
          candidate.commercialUsername = block.commercialUsername;
          candidate.declaredDailyAmount = candidate.applicableDailyAmount;
        }
      }
    }
  }

  private blockOf(row: TontineFieldControlMonthRow): TontineFieldControlCollectorBlock | undefined {
    return this.blocks.find(block => block.rows.includes(row));
  }

  private applicableMise(
    history: TontineMemberAmountHistory[],
    fallback: number,
    year: number,
    calendarMonth: number
  ): number {
    const lastDay = new Date(year, calendarMonth, 0).getDate();
    const date = `${year}-${String(calendarMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return getApplicableAmountForDate(history, date, fallback);
  }

  private generateReference(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `TMFC-${crypto.randomUUID()}`;
    }
    return `TMFC-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
