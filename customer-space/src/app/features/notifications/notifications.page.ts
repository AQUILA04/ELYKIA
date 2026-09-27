import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule, RefresherCustomEvent, ViewWillEnter } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerNotificationInboxService } from '../../shared/services/customer-notification-inbox.service';
import { CustomerNotification, CustomerNotificationType } from '../../shared/models/customer.model';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CustomerTabBarComponent],
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage implements ViewWillEnter {
  notifications: CustomerNotification[] = [];
  isLoading = true;
  loadError = false;
  markingAll = false;

  constructor(
    private api: CustomerApiService,
    private inbox: CustomerNotificationInboxService,
    private router: Router,
  ) {}

  ionViewWillEnter(): void {
    void this.load();
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  async load(event?: RefresherCustomEvent): Promise<void> {
    if (!event) {
      this.isLoading = true;
    }
    this.loadError = false;
    try {
      this.notifications = await firstValueFrom(this.api.getNotifications(50));
      this.inbox.setUnreadCount(this.unreadCount);
    } catch {
      this.loadError = true;
    } finally {
      this.isLoading = false;
      void event?.target.complete();
    }
  }

  async markAllRead(): Promise<void> {
    if (this.markingAll || this.unreadCount === 0) {
      return;
    }
    this.markingAll = true;
    try {
      await firstValueFrom(this.api.markAllNotificationsRead());
      this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
      this.inbox.setUnreadCount(0);
    } finally {
      this.markingAll = false;
    }
  }

  async openNotification(notification: CustomerNotification): Promise<void> {
    if (!notification.read) {
      try {
        await firstValueFrom(this.api.markNotificationRead(notification.id));
        notification.read = true;
        this.inbox.setUnreadCount(this.unreadCount);
      } catch {
        // Continuer la navigation même si le marquage échoue
      }
    }
    const path = notification.linkPath?.trim();
    if (path) {
      await this.router.navigateByUrl(path);
    }
  }

  iconFor(type: CustomerNotificationType): string {
    switch (type) {
      case 'REGISTRATION_ACTIVATED':
        return 'checkmark-circle-outline';
      case 'REGISTRATION_REJECTED':
        return 'close-circle-outline';
      case 'CREDIT_PAYMENT_VALIDATED':
      case 'CREDIT_PAYMENT_REJECTED':
        return 'cash-outline';
      case 'TONTINE_PAYMENT_VALIDATED':
      case 'TONTINE_PAYMENT_REJECTED':
        return 'albums-outline';
      case 'ORDER_STATUS_CHANGED':
        return 'bag-check-outline';
      default:
        return 'notifications-outline';
    }
  }
}
