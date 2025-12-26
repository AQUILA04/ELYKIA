import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TontineService } from '../../../services/tontine.service';
import { TontineSession } from '../../../types/tontine.types';

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
    @Inject(MAT_DIALOG_DATA) public data: { session: TontineSession | null }
  ) {
    this.form = this.fb.group({
      startDate: [null, Validators.required],
      endDate: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.data.session) {
      this.form.patchValue({
        startDate: new Date(this.data.session.startDate),
        endDate: new Date(this.data.session.endDate)
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
      startDate: this.formatDate(this.form.value.startDate),
      endDate: this.formatDate(this.form.value.endDate)
    };

    this.tontineService.updateCurrentSession(sessionData).subscribe({
      next: () => {
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.error = error.message || 'Erreur lors de la mise à jour de la session';
        this.loading = false;
      }
    });
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
