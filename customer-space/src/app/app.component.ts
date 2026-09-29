import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { UserJournalService } from './core/telemetry/user-journal.service';
import { CustomerSessionService } from './shared/services/customer-session.service';
import { LayoutService } from './shared/layout/layout.service';
import { isE2eMode } from './shared/utils/e2e';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly session = inject(CustomerSessionService);
  private readonly journal = inject(UserJournalService);
  readonly layout = inject(LayoutService);

  showSplash = true;
  readonly showSidebar = signal(false);

  private subs = new Subscription();
  private appOpenTracked = false;

  ngOnInit(): void {
    this.layout.refresh();
    this.updateSidebarVisibility(this.router.url);
    this.bindExistingSession();

    this.subs.add(
      this.session.session$.subscribe(() => this.updateSidebarVisibility(this.router.url)),
    );
    this.subs.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => {
          this.updateSidebarVisibility(e.urlAfterRedirects);
          void this.trackScreen(e.urlAfterRedirects);
        }),
    );

    if (!this.appOpenTracked) {
      this.appOpenTracked = true;
      this.journal.track('APP_OPEN', 'AUTH');
    }

    const duration = isE2eMode() ? 0 : 1800;
    setTimeout(() => {
      this.showSplash = false;
      if (!this.session.isAuthenticated) return;
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      if (path === '/' || path === '/auth') {
        void this.router.navigateByUrl('/dashboard', { replaceUrl: true });
      }
    }, duration);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private bindExistingSession(): void {
    const s = this.session.currentSession;
    if (s?.isAuthenticated && s.clientId) {
      void this.journal.bindUser(s.clientId, s.phone ?? null);
    }
  }

  private async trackScreen(url: string): Promise<void> {
    const path = url.split('?')[0] || '/';
    const normalized = path.replace(/\/\d+/g, '/:id');
    await this.journal.setScreen(normalized);
    this.journal.track('SCREEN_VIEW', 'NAVIGATION', { screen: normalized });
  }

  private updateSidebarVisibility(url: string): void {
    const path = url.split('?')[0];
    const onAuth = path === '/auth' || path === '/' || path.startsWith('/auth');
    this.showSidebar.set(this.session.isAuthenticated && !onAuth);
  }
}
