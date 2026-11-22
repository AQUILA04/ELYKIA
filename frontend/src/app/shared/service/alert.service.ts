import { Injectable } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { SessionExpiryState } from './session-expiry.state';
import {
  AlertDialogComponent,
  AlertDialogData,
  AlertDialogResult,
  AlertDialogVariant,
} from '../components/alert-dialog/alert-dialog.component';

export interface AlertActionOptions {
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
  variant?: AlertDialogVariant;
  disableClose?: boolean;
}

export interface AlertPromptOptions {
  title: string;
  message: string;
  inputType?: 'text' | 'password' | 'email';
  inputLabel?: string;
  inputPlaceholder?: string;
  initialValue?: string;
  minLength?: number;
  confirmButtonText?: string;
  cancelButtonText?: string;
  variant?: AlertDialogVariant;
  validator?: (value: string) => string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  constructor(
    private readonly dialog: Dialog,
    private readonly sessionExpiry: SessionExpiryState,
  ) {}

  showSuccess(message: string, title: string = 'Succès'): void {
    toast.success(title, {
      description: this.normalizeToastMessage(message),
    });
  }

  toastSuccess(message: string, title: string = 'Succès'): void {
    this.showSuccess(message, title);
  }

  toastError(message: string, title: string = 'Erreur'): void {
    this.showError(message, title);
  }

  /**
   * Ferme toute modale ouverte et prévient une seule fois que la session est finie.
   * Appelé après {@link SessionExpiryState.begin}, donc hors du garde de {@link toastError}.
   */
  notifySessionExpired(): void {
    this.closeAllDialogs();
    toast.error('Session expirée', {
      description: 'Votre session a expiré. Veuillez vous reconnecter.',
      duration: 6000,
    });
  }

  toastNotif(message: string, title: string = 'Erreur', type?: string): void {
    if (type === 'error') {
      this.toastError(message, title);
    } else if (type === 'success') {
      this.toastSuccess(message, title);
    } else if (type === 'info') {
      this.showInfo(message, title);
    } else {
      this.showWarning(message, title);
    }
  }

  showError(message: string, title: string = 'Erreur'): void {
    if (this.sessionExpiry.isActive()) {
      return;
    }
    toast.error(title, {
      description: this.normalizeToastMessage(message),
      duration: 6000,
    });
  }

  showWarning(message: string, title: string = 'Avertissement'): void {
    toast.warning(title, {
      description: this.normalizeToastMessage(message),
      duration: 5500,
    });
  }

  showInfo(message: string, title: string = 'Information'): void {
    toast.info(title, {
      description: this.normalizeToastMessage(message),
    });
  }

  showDefaultSucces(message: string): void {
    this.showSuccess(message, 'Opération réussie');
  }

  showDefaultError(message: string): void {
    this.showError(message, 'Opération échouée');
  }

  showConfirmation(
    title: string,
    text: string,
    confirmButtonText: string = 'Oui',
    cancelButtonText: string = 'Annuler',
    variant: AlertDialogVariant = 'primary',
  ): Promise<boolean> {
    const dialogRef = this.dialog.open<AlertDialogResult, AlertDialogData>(AlertDialogComponent, {
      data: {
        mode: 'confirm',
        variant,
        title,
        message: text,
        confirmButtonText,
        cancelButtonText,
        showCancelButton: true,
      },
      backdropClass: 'elykia-alert-dialog-backdrop',
      panelClass: 'elykia-alert-dialog-panel',
      autoFocus: '[data-testid="elykia-alert-cancel"]',
      restoreFocus: true,
    });

    return firstValueFrom(dialogRef.closed).then((result) => result?.confirmed === true);
  }

  showDeleteConfirmation(text: string): Promise<boolean> {
    return this.showConfirmation(
      'Confirmation de suppression',
      text,
      'Supprimer',
      'Annuler',
      'danger',
    );
  }

  showActionAlert(options: AlertActionOptions): Promise<boolean> {
    const dialogRef = this.dialog.open<AlertDialogResult, AlertDialogData>(AlertDialogComponent, {
      data: {
        mode: 'action',
        variant: options.variant ?? 'info',
        title: options.title,
        message: options.message,
        confirmButtonText: options.confirmButtonText ?? 'OK',
        cancelButtonText: options.cancelButtonText ?? 'Annuler',
        showCancelButton: options.showCancelButton ?? false,
      },
      disableClose: options.disableClose ?? false,
      backdropClass: 'elykia-alert-dialog-backdrop',
      panelClass: 'elykia-alert-dialog-panel',
      autoFocus: '[data-testid="elykia-alert-confirm"]',
      restoreFocus: true,
    });

    return firstValueFrom(dialogRef.closed).then((result) => result?.confirmed === true);
  }

  showPrompt(options: AlertPromptOptions): Promise<string | null> {
    const dialogRef = this.dialog.open<AlertDialogResult, AlertDialogData>(AlertDialogComponent, {
      data: {
        mode: 'prompt',
        variant: options.variant ?? 'primary',
        title: options.title,
        message: options.message,
        confirmButtonText: options.confirmButtonText ?? 'Valider',
        cancelButtonText: options.cancelButtonText ?? 'Annuler',
        showCancelButton: true,
        inputType: options.inputType ?? 'text',
        inputLabel: options.inputLabel,
        inputPlaceholder: options.inputPlaceholder,
        initialValue: options.initialValue,
        minLength: options.minLength,
        validator: options.validator,
      },
      backdropClass: 'elykia-alert-dialog-backdrop',
      panelClass: 'elykia-alert-dialog-panel',
      autoFocus: '[data-testid="elykia-alert-input"]',
      restoreFocus: true,
    });

    return firstValueFrom(dialogRef.closed).then((result) =>
      result?.confirmed ? (result.value ?? '') : null,
    );
  }

  closeAllDialogs(): void {
    this.dialog.closeAll();
  }

  private normalizeToastMessage(message: string): string {
    if (!message) {
      return '';
    }
    return message
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
