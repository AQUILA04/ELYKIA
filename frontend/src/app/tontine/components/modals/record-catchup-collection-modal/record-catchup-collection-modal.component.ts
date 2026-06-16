import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TontineService } from '../../../services/tontine.service';
import { TontineCatchupPreview, TontineMember, TONTINE_CONSTANTS, formatCurrency } from '../../../types/tontine.types';

@Component({
  selector: 'app-record-catchup-collection-modal',
  templateUrl: './record-catchup-collection-modal.component.html',
  styleUrls: ['./record-catchup-collection-modal.component.scss']
})
export class RecordCatchupCollectionModalComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  TONTINE_CONSTANTS = TONTINE_CONSTANTS;
  minDate: Date;
  maxDate: Date;
  private requestReference = '';
  previewLoading = false;
  catchupPreview: TontineCatchupPreview | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RecordCatchupCollectionModalComponent>,
    private tontineService: TontineService,
    @Inject(MAT_DIALOG_DATA) public data: { member: TontineMember }
  ) {
    this.maxDate = this.getYesterday();
    this.minDate = this.getMinCatchupDate();

    this.form = this.fb.group({
      collectionDate: [null, Validators.required],
      catchupDailyStake: [
        data?.member?.amount || null,
        [Validators.required, Validators.min(1)]
      ],
      amount: [
        null,
        [
          Validators.required,
          Validators.min(TONTINE_CONSTANTS.MIN_COLLECTION_AMOUNT),
          Validators.max(TONTINE_CONSTANTS.MAX_COLLECTION_AMOUNT)
        ]
      ]
    });
  }

  ngOnInit(): void {
    this.requestReference = this.generateRequestReference();
    this.form.get('collectionDate')?.valueChanges.subscribe((date: Date | null) => {
      if (!date) {
        this.catchupPreview = null;
        return;
      }
      this.loadCatchupPreview(date);
    });
  }

  getClientName(): string {
    return `${this.data.member.client.firstname} ${this.data.member.client.lastname}`;
  }

  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  formatDateLabel(date: Date): string {
    return date.toLocaleDateString('fr-FR');
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const collectionData = {
      memberId: this.data.member.id,
      amount: this.form.value.amount,
      catchupDailyStake: this.form.value.catchupDailyStake,
      collectionDate: this.formatDate(this.form.value.collectionDate),
      notes: 'Rattrapage',
      reference: this.requestReference
    };

    this.tontineService.createCollection(collectionData).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.error = error.message || 'Erreur lors de l\'enregistrement de la collecte de rattrapage';
        this.loading = false;
      }
    });
  }

  private loadCatchupPreview(date: Date): void {
    const dateAsString = this.formatDate(date);
    this.previewLoading = true;
    this.tontineService.getCatchupPreview(this.data.member.id, dateAsString).subscribe({
      next: (response) => {
        this.catchupPreview = response.data ?? null;
        const stakeControl = this.form.get('catchupDailyStake');
        if (!stakeControl || !this.catchupPreview) {
          this.previewLoading = false;
          return;
        }

        if (stakeControl.pristine || this.catchupPreview.monthLocked) {
          stakeControl.setValue(this.catchupPreview.applicableDailyStake);
        }

        if (this.catchupPreview.monthLocked) {
          stakeControl.disable({ emitEvent: false });
        } else {
          stakeControl.enable({ emitEvent: false });
        }
        this.previewLoading = false;
      },
      error: (err) => {
        this.catchupPreview = null;
        this.previewLoading = false;
        this.error = err?.message || 'Impossible de prévisualiser le rattrapage pour cette date.';
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private getYesterday(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 1);
    return date;
  }

  private getMinCatchupDate(): Date {
    const sessionStart = this.data.member.tontineSession?.startDate;
    const registration = this.data.member.registrationDate;
    let min = sessionStart ? new Date(sessionStart) : new Date(this.maxDate);

    if (registration) {
      const regDate = new Date(registration);
      if (regDate > min) {
        min = regDate;
      }
    }

    min.setHours(0, 0, 0, 0);
    if (min > this.maxDate) {
      return this.maxDate;
    }
    return min;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private generateRequestReference(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `TONT-CATCH-${crypto.randomUUID()}`;
    }
    return `TONT-CATCH-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
