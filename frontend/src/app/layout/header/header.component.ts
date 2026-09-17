import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AuthService } from "../../auth/service/auth.service";
import { LayoutService } from 'src/app/shared/service/layout.service';
import { environment } from 'src/environments/environment';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { AiPermissions } from 'src/app/shared/constants/ai-permission.constant';
import { NgxPermissionsService } from 'ngx-permissions';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import {
  AppNotificationGroup,
  AppNotificationItem,
  AppNotificationService
} from 'src/app/shared/service/app-notification.service';
import { PendingOpsToastService } from 'src/app/shared/service/pending-ops-toast.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  username: string | null = '';
  showElykiaAi = false;
  showNotifications = false;
  unreadCount = 0;
  notificationGroups: AppNotificationGroup[] = [];
  notificationsLoading = false;
  private pollSub?: Subscription;

  constructor(private router: Router,
    private tokenStorage: TokenStorageService,
    private authService: AuthService,
    private alertService: AlertService,
    private layoutService: LayoutService,
    private featureFlagService: FeatureFlagService,
    private permissionsService: NgxPermissionsService,
    private userService: UserService,
    private appNotificationService: AppNotificationService,
    private pendingOpsToastService: PendingOpsToastService
  ) {
  }

  toggleSidebar() {
    this.layoutService.toggleSidebar();
  }

  ngOnInit(): void {
    this.username = this.authService.getUsername();
    this.refreshElykiaAiVisibility();
    this.featureFlagService.flags$.subscribe(() => this.refreshElykiaAiVisibility());

    this.showNotifications =
      this.userService.hasProfile(UserProfile.SECRETARY)
      || this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.PROMOTER);

    if (this.showNotifications) {
      this.refreshUnreadCount();
      this.pollSub = interval(60_000).subscribe(() => this.refreshUnreadCount());
      this.pendingOpsToastService.maybeShowAfterLogin();
    }
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  private refreshElykiaAiVisibility(): void {
    const featureEnabled =
      environment.aiChatEnabled ||
      this.featureFlagService.isFeatureEnabled(FeatureFlags.ElykiaAi);
    if (!featureEnabled) {
      this.showElykiaAi = false;
      return;
    }
    void this.permissionsService.hasPermission(AiPermissions.Chat).then((hasRole) => {
      this.showElykiaAi = hasRole;
    });
  }

  refreshUnreadCount(): void {
    if (!this.showNotifications) {
      return;
    }
    this.appNotificationService.unreadCount().subscribe({
      next: (count) => this.unreadCount = count,
      error: () => { /* ignore for badge */ }
    });
  }

  onNotificationsOpen(): void {
    if (!this.showNotifications) {
      return;
    }
    this.notificationsLoading = true;
    this.appNotificationService.listGrouped().subscribe({
      next: (groups) => {
        this.notificationGroups = groups;
        this.notificationsLoading = false;
        this.refreshUnreadCount();
      },
      error: () => {
        this.notificationsLoading = false;
        this.alertService.toastError('Impossible de charger les notifications.');
      }
    });
  }

  openNotification(item: AppNotificationItem): void {
    this.appNotificationService.markRead(item.id).subscribe({
      next: () => {
        item.read = true;
        this.refreshUnreadCount();
      }
    });
    const path = item.linkPath || '/notifications';
    const queryParams = this.parseQuery(item.linkQuery);
    void this.router.navigate([path], { queryParams });
  }

  markAllRead(): void {
    this.appNotificationService.markAllRead().subscribe({
      next: () => {
        this.notificationGroups = this.notificationGroups.map((g) => ({
          ...g,
          items: g.items.map((i) => ({ ...i, read: true }))
        }));
        this.unreadCount = 0;
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
      default:
        return 'Notification';
    }
  }

  confirmLogout(): void {
    this.alertService.showConfirmation('Confirmation de deconnexion', 'Voulez-vous vraiment vous déconnecter?', 'Oui', 'Non')
      .then((result) => {
        if (result) {
          this.logout();
        }
      });
  }

  logout(): void {
    this.pendingOpsToastService.clearSessionFlag();
    this.authService.logout();
    localStorage.setItem('logout-event', Date.now().toString());
  }

  private parseQuery(linkQuery?: string | null): Record<string, string> {
    if (!linkQuery) {
      return {};
    }
    const params: Record<string, string> = {};
    linkQuery.split('&').forEach((part) => {
      const [key, value] = part.split('=');
      if (key) {
        params[key] = value ?? '';
      }
    });
    return params;
  }
}
