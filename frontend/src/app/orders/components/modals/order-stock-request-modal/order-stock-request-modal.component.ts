import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Order } from '../../../types/order.types';

export interface OrderStockRequestGroup {
  collector: string;
  articles: { name: string; quantity: number }[];
  orderIds: number[];
}

export interface OrderStockRequestModalData {
  orders: Order[];
}

export interface OrderStockRequestModalResult {
  confirmed: boolean;
  forNextMonth: boolean;
}

@Component({
  selector: 'app-order-stock-request-modal',
  templateUrl: './order-stock-request-modal.component.html',
  styleUrls: ['./order-stock-request-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderStockRequestModalComponent {
  forNextMonth = false;
  groups: OrderStockRequestGroup[] = [];

  constructor(
    public dialogRef: MatDialogRef<OrderStockRequestModalComponent, OrderStockRequestModalResult>,
    @Inject(MAT_DIALOG_DATA) public data: OrderStockRequestModalData
  ) {
    this.groups = this.buildGroups(data.orders || []);
  }

  onConfirm(): void {
    this.dialogRef.close({ confirmed: true, forNextMonth: this.forNextMonth });
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false, forNextMonth: false });
  }

  get orderCount(): number {
    return this.data.orders?.length || 0;
  }

  private buildGroups(orders: Order[]): OrderStockRequestGroup[] {
    const byCollector = new Map<string, OrderStockRequestGroup>();
    for (const order of orders) {
      const collector = order.commercial || order.client?.collector || 'Non assigné';
      let group = byCollector.get(collector);
      if (!group) {
        group = { collector, articles: [], orderIds: [] };
        byCollector.set(collector, group);
      }
      group.orderIds.push(order.id);
      for (const item of order.items || []) {
        const name = item.article?.commercialName || item.article?.name || `Article #${item.article?.id}`;
        const existing = group.articles.find(a => a.name === name);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          group.articles.push({ name, quantity: item.quantity });
        }
      }
    }
    return Array.from(byCollector.values());
  }
}
