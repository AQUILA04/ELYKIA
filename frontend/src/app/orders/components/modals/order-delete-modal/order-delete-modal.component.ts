import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Order, formatCurrency, formatDateTime } from '../../../types/order.types';

export interface DeleteModalData {
  order: Order;
}

@Component({
  selector: 'app-order-delete-modal',
  templateUrl: './order-delete-modal.component.html',
  styleUrls: ['./order-delete-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderDeleteModalComponent {
  constructor(
    public dialogRef: MatDialogRef<OrderDeleteModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteModalData
  ) {}

  /**
   * Confirme la suppression
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
   * Formate une devise
   */
  formatCurrency(amount: number): string {
    return formatCurrency(amount);
  }

  /**
   * Formate une date/heure
   */
  formatDateTime(dateString: string): string {
    return formatDateTime(dateString);
  }

  /**
   * Calcule le nombre total d'articles
   */
  get totalItems(): number {
    return this.data.order.items?.reduce((total, item) => total + item.quantity, 0) || 0;
  }

  /**
   * Retourne le nom complet du client
   */
  getClientName(order: Order): string {
    return `${order.client?.firstname || ''} ${order.client?.lastname || ''}`.trim() || 'Client inconnu';
  }
}