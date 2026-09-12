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
  TontineCatchupNotificationGroup,
  TontineCatchupNotificationItem,
  TontineCatchupNotificationService
} from 'src/app/tontine/services/tontine-catchup-notification.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  username: string | null = '';
  showElykiaAi = false;
  showCatchupNotifications = false;
  unreadCount = 0;
  notificationGroups: TontineCatchupNotificationGroup[] = [];
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
    private catchupNotificationService: TontineCatchupNotificationService
  ) {
  }

  toggleSidebar() {
    this.layoutService.toggleSidebar();
  }

  ngOnInit(): void {
    this.username = this.authService.getUsername();
    this.refreshElykiaAiVisibility();
    this.featureFlagService.flags$.subscribe(() => this.refreshElykiaAiVisibility());

    this.showCatchupNotifications =
      this.userService.hasProfile(UserProfile.SECRETARY)
      || this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN);

    if (this.showCatchupNotifications) {
      this.refreshUnreadCount();
      this.pollSub = interval(60_000).subscribe(() => this.refreshUnreadCount());
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
    if (!this.showCatchupNotifications) {
      return;
    }
    this.catchupNotificationService.unreadCount().subscribe({
      next: (count) => this.unreadCount = count,
      error: () => { /* ignore for badge */ }
    });
  }

  onNotificationsOpen(): void {
    if (!this.showCatchupNotifications) {
      return;
    }
    this.notificationsLoading = true;
    this.catchupNotificationService.listGrouped().subscribe({
      next: (groups) => {
        this.notificationGroups = groups;
        this.notificationsLoading = false;
        this.refreshUnreadCount();
      },
      error: () => {
        this.notificationsLoading = false;
        this.alertService.toastError('Impossible de charger les notifications rattrapage.');
      }
    });
  }

  openNotification(item: TontineCatchupNotificationItem): void {
    this.catchupNotificationService.markRead(item.id).subscribe({
      next: () => {
        item.read = true;
        this.refreshUnreadCount();
      }
    });
    void this.router.navigate(['/report/daily'], {
      queryParams: {
        collector: item.commercialUsername,
        startDate: item.operationDate,
        endDate: item.operationDate
      }
    });
  }

  markAllRead(): void {
    this.catchupNotificationService.markAllRead().subscribe({
      next: () => {
        this.notificationGroups = this.notificationGroups.map((g) => ({
          ...g,
          items: g.items.map((i) => ({ ...i, read: true }))
        }));
        this.unreadCount = 0;
      }
    });
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
    this.authService.logout();
    localStorage.setItem('logout-event', Date.now().toString());
  }
}
