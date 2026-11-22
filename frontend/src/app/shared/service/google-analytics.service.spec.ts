import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { GoogleAnalyticsService } from './google-analytics.service';

describe('GoogleAnalyticsService', () => {
  let service: GoogleAnalyticsService;
  let routerEvents$: Subject<unknown>;
  let doc: Document;

  beforeEach(() => {
    routerEvents$ = new Subject<unknown>();
    TestBed.configureTestingModule({
      providers: [
        GoogleAnalyticsService,
        {
          provide: Router,
          useValue: { events: routerEvents$.asObservable() },
        },
      ],
    });

    service = TestBed.inject(GoogleAnalyticsService);
    doc = TestBed.inject(DOCUMENT);
    doc.querySelectorAll('script[data-elykia-ga]').forEach((el) => el.remove());
    if (doc.defaultView) {
      delete doc.defaultView.gtag;
      delete doc.defaultView.dataLayer;
    }
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('ignores empty or placeholder measurement IDs', () => {
    service.init('');
    service.init('__GA_MEASUREMENT_ID__');

    expect(doc.querySelector('script[data-elykia-ga]')).toBeNull();
  });

  it('injects gtag script and tracks page_view on NavigationEnd', () => {
    service.init('G-TEST1234');

    const script = doc.querySelector('script[data-elykia-ga="G-TEST1234"]') as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.src).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST1234');

    routerEvents$.next(new NavigationEnd(1, '/home', '/home'));

    const dataLayer = doc.defaultView?.dataLayer ?? [];
    const pageViewCall = dataLayer.find(
      (entry) => Array.isArray(entry) && entry[0] === 'event' && entry[1] === 'page_view'
    ) as unknown[] | undefined;
    expect(pageViewCall).toBeDefined();
    expect((pageViewCall?.[2] as Record<string, unknown>)?.['page_path']).toBe('/home');
  });
});
