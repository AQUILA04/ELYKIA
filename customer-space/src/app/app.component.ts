import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
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
  readonly layout = inject(LayoutService);

  showSplash = true;
  readonly showSidebar = signal(false);

  private subs = new Subscription();

  ngOnInit(): void {
    this.layout.refresh();
    this.updateSidebarVisibility(this.router.url);

    this.subs.add(
      this.session.session$.subscribe(() => this.updateSidebarVisibility(this.router.url)),
    );
    this.subs.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => this.updateSidebarVisibility(e.urlAfterRedirects)),
    );

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

  private updateSidebarVisibility(url: string): void {
    const path = url.split('?')[0];
    const onAuth = path === '/auth' || path === '/' || path.startsWith('/auth');
    this.showSidebar.set(this.session.isAuthenticated && !onAuth);
  }
}
