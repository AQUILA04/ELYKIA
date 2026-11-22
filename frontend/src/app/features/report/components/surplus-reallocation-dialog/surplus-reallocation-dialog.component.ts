import { Component, Inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { CashDepositService } from '../../service/cash-deposit.service';
import { SurplusReallocation, SurplusReallocationDay } from '../../models/surplus-reallocation.model';

export interface SurplusReallocationDialogData {
  commercialUsername: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-surplus-reallocation-dialog',
  templateUrl: './surplus-reallocation-dialog.component.html',
  styleUrls: ['./surplus-reallocation-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class SurplusReallocationDialogComponent implements OnInit, OnDestroy {
  includeNewBalance = false;
  priorityDates: string[] = [];

  preview: SurplusReallocation | null = null;
  loading = true;
  saving = false;
  error: string | null = null;

  private loadSub?: Subscription;

  constructor(
    public dialogRef: MatDialogRef<SurplusReallocationDialogComponent, SurplusReallocation | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: SurplusReallocationDialogData,
    private cashDepositService: CashDepositService
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  get days(): SurplusReallocationDay[] {
    return this.preview?.days || [];
  }

  get canConfirm(): boolean {
    return !this.loading && !this.saving && (this.preview?.totalReallocated || 0) > 0;
  }

  get showSoldeHint(): boolean {
    return !this.includeNewBalance && this.days.some(day => (day.newBalanceGap || 0) > 0)
      && (this.preview?.totalReallocated || 0) <= 0;
  }

  reload(): void {
    this.loading = true;
    this.error = null;
    this.loadSub?.unsubscribe();
    this.loadSub = this.cashDepositService.previewReallocateSurplus(
      this.data.commercialUsername,
      this.data.startDate,
      this.data.endDate,
      {
        includeNewBalance: this.includeNewBalance,
        priorityDates: this.priorityDates
      }
    ).subscribe({
      next: (preview) => {
        this.preview = preview;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || err?.error || 'Aperçu impossible.';
      }
    });
  }

  onIncludeNewBalanceChange(): void {
    this.reload();
  }

  isPriority(day: SurplusReallocationDay): boolean {
    return this.priorityDates.includes(day.date);
  }

  togglePriority(day: SurplusReallocationDay, checked: boolean): void {
    if (checked) {
      if (!this.priorityDates.includes(day.date)) {
        this.priorityDates = [...this.priorityDates, day.date];
      }
    } else {
      this.priorityDates = this.priorityDates.filter(date => date !== day.date);
    }
    this.reload();
  }

  allocated(day: SurplusReallocationDay): number {
    return (day.creditAllocated || 0) + (day.tontineAllocated || 0) + (day.newBalanceAllocated || 0);
  }

  formatDate(value: string | undefined): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
    return match ? `${match[3]}/${match[2]}/${match[1]}` : (value || '');
  }

  confirm(): void {
    if (!this.canConfirm) {
      return;
    }
    this.saving = true;
    this.error = null;
    this.cashDepositService.reallocateSurplus(
      this.data.commercialUsername,
      this.data.startDate,
      this.data.endDate,
      {
        includeNewBalance: this.includeNewBalance,
        priorityDates: this.priorityDates
      }
    ).subscribe({
      next: (result) => {
        this.saving = false;
        this.dialogRef.close(result);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || err?.error || 'Équilibrage impossible.';
      }
    });
  }

  close(): void {
    if (!this.saving) {
      this.dialogRef.close();
    }
  }
}
