import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmationData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

@Component({
  selector: 'app-order-confirmation-modal',
  templateUrl: './order-confirmation-modal.component.html',
  styleUrls: ['./order-confirmation-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderConfirmationModalComponent {
  constructor(
    public dialogRef: MatDialogRef<OrderConfirmationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationData
  ) {
    // Valeurs par défaut
    this.data = {
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      type: 'warning',
      ...data
    };
  }

  /**
   * Confirme l'action
   */
  onConfirm(): void {
    this.dialogRef.close(true);
  }

  /**
   * Annule l'action
   */
  onCancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * Retourne l'icône selon le type
   */
  get icon(): string {
    const icons = {
      warning: 'warning',
      danger: 'error',
      info: 'info'
    };
    return icons[this.data.type || 'warning'];
  }

  /**
   * Retourne la couleur selon le type
   */
  get iconColor(): string {
    const colors = {
      warning: '#f57c00',
      danger: '#d32f2f',
      info: '#1976d2'
    };
    return colors[this.data.type || 'warning'];
  }
}
