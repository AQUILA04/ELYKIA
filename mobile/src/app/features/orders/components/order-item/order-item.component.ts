import { Component, Input } from '@angular/core';
import { OrderView } from '../../../../models/order-view.model';
import { getOrderStatusClass, getOrderStatusLabel } from '../../../../core/utils/order-status.util';

@Component({
  selector: 'app-order-item',
  templateUrl: './order-item.component.html',
  styleUrls: ['./order-item.component.scss'],
  standalone: false
})
export class OrderItemComponent {
  @Input() order!: OrderView;

  getStatusLabel(status: string): string {
    return getOrderStatusLabel(status);
  }

  getStatusClass(status: string): string {
    return getOrderStatusClass(status);
  }

  get clientDisplayName(): string {
    if (this.order.clientName) {
      return this.order.clientName;
    }
    const client = this.order.client;
    if (client) {
      return client.fullName || `${client.firstname || ''} ${client.lastname || ''}`.trim();
    }
    return 'Client inconnu';
  }

  get displayDate(): string {
    return this.order.createdAt || this.order.startDate || '';
  }
}
