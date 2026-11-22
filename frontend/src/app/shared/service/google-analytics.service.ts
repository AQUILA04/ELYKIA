import { DOCUMENT } from '@angular/core';
import { Inject, Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

@Injectable({
  providedIn: 'root',
})
export class GoogleAnalyticsService implements OnDestroy {
  private initialized = false;
  private routerSub?: Subscription;

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly router: Router
  ) {}

  init(measurementId: string = environment.gaMeasurementId): void {
    if (this.initialized) {
      return;
    }

    const id = (measurementId || '').trim();
    if (!id || id === '__GA_MEASUREMENT_ID__') {
      return;
    }

    this.initialized = true;
    const win = this.document.defaultView;
    if (!win) {
      return;
    }

    win.dataLayer = win.dataLayer || [];
    if (!win.gtag) {
      win.gtag = function gtag(...args: unknown[]) {
        win.dataLayer?.push(args);
      };
    }

    if (!this.document.querySelector(`script[data-elykia-ga="${id}"]`)) {
      const script = this.document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      script.setAttribute('data-elykia-ga', id);
      this.document.head.appendChild(script);
    }

    win.gtag('js', new Date());
    win.gtag('config', id, { send_page_view: false });

    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        win.gtag?.('event', 'page_view', {
          page_path: event.urlAfterRedirects,
          page_location: win.location?.href,
          page_title: this.document.title,
        });
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }
}
