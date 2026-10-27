import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { TontineService } from '../../../services/tontine.service';
import { TontineSessionService } from '../../../services/tontine-session.service';

@Component({
  selector: 'app-create-session-modal',
  templateUrl: './create-session-modal.component.html',
  styleUrls: ['./create-session-modal.component.scss']
})
export class CreateSessionModalComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateSessionModalComponent>,
    private tontineService: TontineService,
    private sessionService: TontineSessionService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(120)]],
      code: ['', [Validators.maxLength(40)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const startDate = this.formatDate(this.form.value.startDate);
    const endDate = this.formatDate(this.form.value.endDate);
    if (endDate <= startDate) {
      this.error = 'La date de fin doit être postérieure à la date de début.';
      return;
    }

    this.loading = true;
    this.error = null;
    const code = (this.form.value.code || '').trim();
    this.tontineService.createSession({
      name: this.form.value.name.trim(),
      code: code || undefined,
      startDate,
      endDate
    }).subscribe({
      next: () => {
        this.sessionService.requestRefresh();
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.error = error.message || 'Erreur lors de la création de la session';
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
