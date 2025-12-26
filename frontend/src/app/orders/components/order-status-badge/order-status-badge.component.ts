import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { OrderStatus, getOrderStatusLabel, getOrderStatusColor } from '../../types/order.types';

@Component({
  selector: 'app-order-status-badge',
  templateUrl: './order-status-badge.component.html',
  styleUrls: ['./order-status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderStatusBadgeComponent {
  @Input() status!: OrderStatus;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  /**
   * Retourne le label du statut
   */
  get statusLabel(): string {
    return getOrderStatusLabel(this.status);
  }

  /**
   * Retourne la classe CSS pour la couleur du statut
   */
  get statusColorClass(): string {
    return `status-badge--${getOrderStatusColor(this.status)}`;
  }

  /**
   * Retourne la classe CSS pour la taille
   */
  get sizeClass(): string {
    return `status-badge--${this.size}`;
  }

  /**
   * Retourne l'icône associée au statut
   */
  get statusIcon(): string {
    const icons = {
      [OrderStatus.PENDING]: 'schedule',
      [OrderStatus.ACCEPTED]: 'check_circle',
      [OrderStatus.DENIED]: 'cancel',
      [OrderStatus.CANCEL]: 'block',
      [OrderStatus.SOLD]: 'monetization_on'
    };
    return icons[this.status] || 'help';
  }
}