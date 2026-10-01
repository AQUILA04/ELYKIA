import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Subscription, filter } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { CustomerSessionService } from '../../services/customer-session.service';
import { CustomerNotificationInboxService } from '../../services/customer-notification-inbox.service';
import { APP_VERSION } from '../../../../environments/app-version';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  testId: string;
  badge?: 'cart' | 'notifications';
}

@Component({
  selector: 'app-desktop-sidebar',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './desktop-sidebar.component.html',
  styleUrls: ['./desktop-sidebar.component.scss'],
})
export class DesktopSidebarComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly sessionService = inject(CustomerSessionService);
  private readonly cartService = inject(CartService);
  private readonly notificationInbox = inject(CustomerNotificationInboxService);

  readonly appVersion = APP_VERSION;
  readonly cartCount = signal(0);
  readonly unreadCount = signal(0);
  readonly displayName = signal('');
  readonly phone = signal('');
  readonly activePath = signal('');

  readonly navItems: NavItem[] = [
    { label: 'Accueil', path: '/dashboard', icon: 'home-outline', testId: 'e2e-nav-dashboard' },
    { label: 'Achats', path: '/purchases', icon: 'receipt-outline', testId: 'e2e-nav-purchases' },
    { label: 'Tontine', path: '/tontines', icon: 'albums-outline', testId: 'e2e-nav-tontines' },
    { label: 'Commander', path: '/catalog', icon: 'bag-add-outline', testId: 'e2e-nav-catalog' },
    { label: 'Panier', path: '/cart', icon: 'cart-outline', testId: 'e2e-nav-cart', badge: 'cart' },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: 'notifications-outline',
      testId: 'e2e-nav-notifications',
      badge: 'notifications',
    },
    { label: 'Profil', path: '/profile', icon: 'person-outline', testId: 'e2e-nav-profile' },
  ];

  private subs = new Subscription();

  ngOnInit(): void {
    this.syncSession();
    this.activePath.set(this.router.url);
    this.cartCount.set(this.cartService.totalItems);

    this.subs.add(
      this.sessionService.session$.subscribe(() => this.syncSession()),
    );
    this.subs.add(
      this.cartService.cart$.subscribe(() => this.cartCount.set(this.cartService.totalItems)),
    );
    this.subs.add(
      this.notificationInbox.unreadCount$.subscribe((count) => this.unreadCount.set(count)),
    );
    this.subs.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => this.activePath.set(e.urlAfterRedirects)),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  isActive(path: string): boolean {
    const url = this.activePath();
    if (path === '/dashboard') return url === '/dashboard' || url.startsWith('/dashboard?');
    return url === path || url.startsWith(path + '/');
  }

  logout(): void {
    this.sessionService.clearSession();
    void this.router.navigate(['/auth'], { replaceUrl: true });
  }

  private syncSession(): void {
    const s = this.sessionService.currentSession;
    this.displayName.set(s?.fullName?.trim() || 'Client');
    this.phone.set(s?.phone || '');
  }
}
