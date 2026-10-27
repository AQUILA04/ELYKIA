import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TontineService } from '../../../services/tontine.service';
import { TontineSession } from '../../../types/tontine.types';
import { TontineSessionService } from '../../../services/tontine-session.service';

@Component({
  selector: 'app-session-settings-modal',
  templateUrl: './session-settings-modal.component.html',
  styleUrls: ['./session-settings-modal.component.scss']
})
export class SessionSettingsModalComponent implements OnInit {
  form: FormGroup;
  loading: boolean = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SessionSettingsModalComponent>,
    private tontineService: TontineService,
    private sessionService: TontineSessionService,
    @Inject(MAT_DIALOG_DATA) public data: { session: TontineSession | null }
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.maxLength(120)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.data.session) {
      this.form.patchValue({
        name: this.data.session.name || '',
        startDate: this.parseDate(this.data.session.startDate),
        endDate: this.parseDate(this.data.session.endDate)
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const sessionData = {
      name: (this.form.value.name || '').trim() || undefined,
      startDate: this.formatDate(this.form.value.startDate),
      endDate: this.formatDate(this.form.value.endDate)
    };
    const sessionId = this.data.session?.id;
    const request = sessionId
      ? this.tontineService.updateSession(sessionId, sessionData)
      : this.tontineService.updateCurrentSession(sessionData);

    request.subscribe({
      next: () => {
        this.sessionService.requestRefresh();
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.error = error.message || 'Erreur lors de la mise à jour de la session';
        this.loading = false;
      }
    });
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.substring(0, 10).split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

