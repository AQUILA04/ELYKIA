import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TontineService } from '../../../services/tontine.service';
import { TontineMember } from '../../../types/tontine.types';

@Component({
  selector: 'app-edit-adhesion-date-modal',
  templateUrl: './edit-adhesion-date-modal.component.html',
  styleUrls: ['./edit-adhesion-date-modal.component.scss']
})
export class EditAdhesionDateModalComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  minDate: Date;
  maxDate: Date;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditAdhesionDateModalComponent>,
    private tontineService: TontineService,
    @Inject(MAT_DIALOG_DATA) public data: { member: TontineMember }
  ) {
    this.minDate = this.parseDate(data.member.tontineSession?.startDate) ?? this.startOfToday();
    this.maxDate = this.startOfToday();
    const sessionEnd = this.parseDate(data.member.tontineSession?.endDate);
    if (sessionEnd && sessionEnd < this.maxDate) {
      this.maxDate = sessionEnd;
    }

    this.form = this.fb.group({
      registrationDate: [
        this.parseDate(data.member.registrationDate),
        Validators.required
      ]
    });
  }

  getClientName(): string {
    const client = this.data.member.client;
    return `${client.firstname} ${client.lastname}`;
  }

  formatDateLabel(date: Date): string {
    return date.toLocaleDateString('fr-FR');
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    const registrationDate = this.formatDate(this.form.value.registrationDate);

    this.tontineService.updateMemberAdhesionDate(this.data.member.id, registrationDate).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.error = err?.message || 'Erreur lors de la modification de la date d\'adhésion';
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private startOfToday(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) {
      return null;
    }
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
