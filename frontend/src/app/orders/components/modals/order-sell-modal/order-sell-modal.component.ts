import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Order, formatCurrency, formatDateTime } from '../../../types/order.types';

export interface SellModalData {
  order: Order;
}

@Component({
  selector: 'app-order-sell-modal',
  templateUrl: './order-sell-modal.component.html',
  styleUrls: ['./order-sell-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderSellModalComponent {
  constructor(
    public dialogRef: MatDialogRef<OrderSellModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SellModalData
  ) {}

  /**
   * Confirme la transformation en vente
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