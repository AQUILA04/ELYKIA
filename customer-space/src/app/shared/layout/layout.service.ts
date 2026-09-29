import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { Capacitor } from '@capacitor/core';

const DESKTOP_MQ = '(min-width: 1024px)';

/**
 * Desktop layout is active only on Capacitor web + viewport ≥ 1024px.
 * Native Android/iOS (including tablets) always stay in mobile layout.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService implements OnDestroy {
  private readonly mediaQuery: MediaQueryList | null =
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ) : null;

  private readonly viewportMatches = signal(this.mediaQuery?.matches ?? false);
  private readonly isWebPlatform = Capacitor.getPlatform() === 'web';

  readonly isDesktop = computed(() => this.isWebPlatform && this.viewportMatches());

  private readonly onChange = (event: MediaQueryListEvent): void => {
    this.viewportMatches.set(event.matches);
    this.syncBodyClass();
  };

  constructor() {
    this.mediaQuery?.addEventListener('change', this.onChange);
    this.syncBodyClass();
  }

  ngOnDestroy(): void {
    this.mediaQuery?.removeEventListener('change', this.onChange);
  }

  /** Force re-evaluation (tests / orientation). */
  refresh(): void {
    this.viewportMatches.set(this.mediaQuery?.matches ?? false);
    this.syncBodyClass();
  }

  private syncBodyClass(): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('elyk-desktop', this.isDesktop());
    document.body.classList.toggle('elyk-web', this.isWebPlatform);
  }
}
