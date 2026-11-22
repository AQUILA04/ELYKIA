import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { NgxPermissionsService } from 'ngx-permissions';
import { NgxSonnerToaster } from 'ngx-sonner';
import { EnvironmentRibbonComponent } from '@shared/components/environment-ribbon/environment-ribbon.component';
import { TokenStorageService } from '@shared/service/token-storage.service';
import { UnitPriceVisibilityService } from '@shared/service/unit-price-visibility.service';
import { AuthService } from './auth/service/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EnvironmentRibbonComponent, NgxSonnerToaster],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly permissionsService: NgxPermissionsService,
    private readonly tokenStorageService: TokenStorageService,
    private readonly authService: AuthService,
    private readonly unitPriceVisibility: UnitPriceVisibilityService,
  ) {}

  ngOnInit(): void {
    this.setupSessionSync();
    this.unitPriceVisibility.ensureLoaded().subscribe();

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.checkAuthentication();
      });

    this.loadUserPermissions();
  }

  loadUserPermissions(): void {
    const userString = this.tokenStorageService.getUser();

    if (userString && Object.keys(userString).length > 0) {
      this.authService.loadPermissionsFromCurrentUser();
    } else {
      this.permissionsService.flushPermissions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSessionSync(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'logout-event') {
        this.handleLogoutEvent();
      }
    });

    window.addEventListener('beforeunload', () => {
      this.handleTabClose();
    });
  }

  private checkAuthentication(): void {
    const currentUrl = this.router.url;
    const publicRoutes = ['/login', '/license'];

    if (publicRoutes.some((route) => currentUrl.startsWith(route))) {
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: currentUrl },
      });
    }
  }

  private handleLogoutEvent(): void {
    if (this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }

  private handleTabClose(): void {
    const openTabsCount = this.getOpenTabsCount();

    if (openTabsCount <= 1) {
      localStorage.setItem('logout-event', Date.now().toString());
    }
  }

  private getOpenTabsCount(): number {
    const tabId = sessionStorage.getItem('tabId') || this.generateTabId();
    sessionStorage.setItem('tabId', tabId);

    const tabs = this.getActiveTabs();
    tabs[tabId] = Date.now();
    localStorage.setItem('active-tabs', JSON.stringify(tabs));

    const now = Date.now();
    const activeTabs = Object.entries(tabs).filter(([, timestamp]) => now - timestamp < 5000);

    return activeTabs.length;
  }

  private getActiveTabs(): Record<string, number> {
    try {
      const tabs = localStorage.getItem('active-tabs');
      return tabs ? JSON.parse(tabs) : {};
    } catch {
      return {};
    }
  }

  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
