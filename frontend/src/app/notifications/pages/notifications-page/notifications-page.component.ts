import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import {
  AppNotificationGroup,
  AppNotificationItem,
  AppNotificationService
} from 'src/app/shared/service/app-notification.service';

@Component({
  selector: 'app-notifications-page',
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class NotificationsPageComponent implements OnInit, OnDestroy {
  groups: AppNotificationGroup[] = [];
  loading = false;
  currentDate = new Date();
  lastUpdate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private notificationService: AppNotificationService,
    private alertService: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  get totalCount(): number {
    return this.groups.reduce((sum, g) => sum + g.items.length, 0);
  }

  get unreadCount(): number {
    return this.groups.reduce(
      (sum, g) => sum + g.items.filter((i) => !i.read).length,
      0
    );
  }

  load(): void {
    this.loading = true;
    this.notificationService.listGrouped().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.loading = false;
        this.lastUpdate = new Date();
      },
      error: () => {
        this.loading = false;
        this.alertService.toastError('Impossible de charger les notifications.');
      }
    });
  }

  open(item: AppNotificationItem): void {
    this.notificationService.markRead(item.id).subscribe();
    const path = item.linkPath || '/notifications';
    const queryParams: Record<string, string> = {};
    if (item.linkQuery) {
      item.linkQuery.split('&').forEach((part) => {
        const [key, value] = part.split('=');
        if (key) {
          queryParams[key] = value ?? '';
        }
      });
    }
    void this.router.navigate([path], { queryParams });
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.groups = this.groups.map((g) => ({
          ...g,
          items: g.items.map((i) => ({ ...i, read: true }))
        }));
      }
    });
  }

  typeLabel(type: string): string {
    switch (type) {
      case 'PAYMENT_DECLARATION':
        return 'Paiement';
      case 'CUSTOMER_ORDER':
        return 'Commande';
      case 'TONTINE_CATCHUP':
        return 'Rattrapage';
      case 'TONTINE_PAYMENT_DECLARATION':
        return 'Cotisation tontine';
      default:
        return 'Notification';
    }
  }
}
