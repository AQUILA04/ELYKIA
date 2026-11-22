import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

export type AlertDialogVariant = 'primary' | 'danger' | 'warning' | 'info';
export type AlertDialogMode = 'confirm' | 'action' | 'prompt';

export interface AlertDialogData {
  mode: AlertDialogMode;
  variant: AlertDialogVariant;
  title: string;
  message: string;
  confirmButtonText: string;
  cancelButtonText?: string;
  showCancelButton: boolean;
  inputType?: 'text' | 'password' | 'email';
  inputLabel?: string;
  inputPlaceholder?: string;
  initialValue?: string;
  minLength?: number;
  validator?: (value: string) => string | null;
}

export interface AlertDialogResult {
  confirmed: boolean;
  value?: string;
}

@Component({
  selector: 'app-alert-dialog',
  imports: [FormsModule],
  templateUrl: './alert-dialog.component.html',
  styleUrl: './alert-dialog.component.scss',
})
export class AlertDialogComponent {
  readonly data = inject<AlertDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject(DialogRef<AlertDialogResult>);

  inputValue = this.data.initialValue ?? '';
  readonly validationError = signal<string | null>(null);

  onInputChange(): void {
    if (this.validationError()) {
      this.validationError.set(null);
    }
  }

  confirm(): void {
    if (this.data.mode === 'prompt') {
      const value = this.inputValue;
      if (this.data.validator) {
        const error = this.data.validator(value);
        if (error) {
          this.validationError.set(error);
          return;
        }
      }
      this.dialogRef.close({ confirmed: true, value });
      return;
    }

    this.dialogRef.close({ confirmed: true });
  }

  cancel(): void {
    this.dialogRef.close({ confirmed: false });
  }
}
