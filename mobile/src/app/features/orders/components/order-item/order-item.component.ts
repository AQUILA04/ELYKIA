import { Component, Input } from '@angular/core';
import { OrderView } from '../../../../models/order-view.model';

@Component({
  selector: 'app-order-item',
  templateUrl: './order-item.component.html',
  styleUrls: ['./order-item.component.scss'],
  standalone: false
})
export class OrderItemComponent {
  @Input() order!: OrderView;

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'ACCEPTED':
        return 'Acceptée';
      case 'DENIED':
        return 'Refusée';
      case 'CANCEL':
        return 'Annulée';
      case 'SOLD':
        return 'Vendue';
      default:
        return status || '—';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'ACCEPTED':
        return 'status-accepted';
      case 'DENIED':
        return 'status-denied';
      case 'CANCEL':
        return 'status-cancel';
      case 'SOLD':
        return 'status-sold';
      default:
        return 'status-pending';
    }
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
