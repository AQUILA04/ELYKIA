import { NgZone } from '@angular/core';
import { LoggerService } from '../../../core/services/logger.service';

const PREFIX = '[TontineControl]';

export function describeFailure(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (error && typeof error === 'object') {
    const detail = error as { name?: string; message?: string; status?: number; statusText?: string };
    return `${detail.name || 'object'} ${detail.status ?? ''} ${detail.message || detail.statusText || ''}`.trim();
  }
  return String(error);
}
const OVERLAYS = new Set([
  'ION-MODAL',
  'ION-BACKDROP',
  'ION-LOADING',
  'ION-ALERT',
  'ION-TOAST',
  'ION-POPOVER',
  'ION-ACTION-SHEET'
]);

/**
 * Traces temporaires du contrôle tontine. Le gel laisse la croix visible :
 * on enregistre erreurs, taps, défilement, overlays et un battement chaque seconde.
 * La dernière ligne écrite est ce qui précède le blocage du thread.
 */
export class TontineControlDebug {
  private static sink?: LoggerService;
  private static pending: string[] = [];

  private readonly stops: Array<() => void> = [];
  private timer = 0;
  private zoneRuns = 0;
  private lastZoneRuns = 0;
  private scrollCount = 0;
  private lastScrollLog = 0;

  constructor(
    private readonly log: LoggerService,
    private readonly zone: NgZone
  ) {}

  static note(message: string): void {
    const sink = TontineControlDebug.sink;
    if (!sink) {
      TontineControlDebug.pending.push(message);
      return;
    }
    sink.trace(`${PREFIX} ${message}`);
  }

  start(summary: string): void {
    TontineControlDebug.sink = this.log;
    const queued = TontineControlDebug.pending.splice(0);
    for (const message of queued) {
      this.write(message);
    }
    this.write(`start ${summary}`);
    this.zone.runOutsideAngular(() => {
      this.listen(window, 'error', event => {
        const err = event as ErrorEvent;
        this.fail('window.error', err.error || err.message);
      });
      this.listen(window, 'unhandledrejection', event => {
        const rejection = event as PromiseRejectionEvent;
        this.fail('unhandledrejection', rejection.reason);
      });
      this.listen(document, 'visibilitychange', () => {
        this.write(`visibility ${document.visibilityState}`);
      });
      this.listen(document, 'freeze', () => this.write('document freeze'));
      this.listen(document, 'resume', () => this.write('document resume'));
      for (const type of ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchcancel']) {
        this.listen(document, type, event => this.onPointer(type, event), true);
      }
      this.listen(window, 'scroll', () => this.onScroll(), true);
      this.observeOverlays();
      const stable = this.zone.onStable.subscribe(() => {
        this.zoneRuns++;
      });
      this.stops.push(() => stable.unsubscribe());
      this.timer = window.setInterval(() => this.heartbeat(), 1000);
    });
  }

  attachScroll(host: HTMLElement): void {
    host.querySelectorAll('.rm-tfc-scroll').forEach(el => {
      this.listen(el, 'scroll', () => this.onScroll());
    });
  }

  event(message: string): void {
    this.write(message);
  }

  stop(reason: string): void {
    this.write(`stop ${reason} ${this.snapshot()}`);
    window.clearInterval(this.timer);
    for (const stop of this.stops) {
      stop();
    }
    this.stops.length = 0;
  }

  private onPointer(type: string, event: Event): void {
    const target = event.target instanceof Element ? event.target : null;
    this.write(`${type} ${this.describe(target)}`);
  }

  private onScroll(): void {
    this.scrollCount++;
    const now = Date.now();
    if (now - this.lastScrollLog < 400) {
      return;
    }
    this.lastScrollLog = now;
    const scroller = document.querySelector('.rm-tfc-scroll') as HTMLElement | null;
    this.write(`scroll top=${scroller ? Math.round(scroller.scrollTop) : -1}`);
  }

  private heartbeat(): void {
    const cycles = this.zoneRuns - this.lastZoneRuns;
    this.lastZoneRuns = this.zoneRuns;
    const line = `beat ${this.snapshot()} cycles=${cycles} scrolls=${this.scrollCount}`;
    this.scrollCount = 0;
    this.write(cycles > 40 ? `CD-STORM ${line}` : line);
  }

  private snapshot(): string {
    const modal = document.querySelector('ion-modal') as HTMLElement | null;
    const app = document.querySelector('ion-app');
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroller = document.querySelector('.rm-tfc-scroll') as HTMLElement | null;
    return [
      `active=${this.describe(active)}`,
      `modal=${modal ? modal.className : 'absent'}`,
      `modalPe=${modal?.style.pointerEvents || '-'}`,
      `appInert=${app?.hasAttribute('inert') ?? false}`,
      `appHidden=${app?.getAttribute('aria-hidden') || '-'}`,
      `backdrops=${document.querySelectorAll('ion-backdrop').length}`,
      `loadings=${document.querySelectorAll('ion-loading').length}`,
      `scrollTop=${scroller ? Math.round(scroller.scrollTop) : -1}`,
      `vis=${document.visibilityState}`
    ].join(' ');
  }

  private observeOverlays(): void {
    const obs = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node instanceof Element && OVERLAYS.has(node.tagName)) {
            this.write(`overlay+ ${node.tagName} ${node.className}`);
          }
        });
        record.removedNodes.forEach(node => {
          if (node instanceof Element && OVERLAYS.has(node.tagName)) {
            this.write(`overlay- ${node.tagName} ${node.className}`);
          }
        });
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    this.stops.push(() => obs.disconnect());
  }

  private listen(
    target: EventTarget,
    type: string,
    handler: (event: Event) => void,
    capture = false
  ): void {
    target.addEventListener(type, handler, capture);
    this.stops.push(() => target.removeEventListener(type, handler, capture));
  }

  private describe(el: Element | null): string {
    if (!el) {
      return 'none';
    }
    const testId = el.getAttribute('data-testid')
      || el.closest('[data-testid]')?.getAttribute('data-testid')
      || '';
    const className = typeof el.className === 'string' ? el.className.split(/\s+/).slice(0, 3).join('.') : '';
    return `${el.tagName}${className ? '.' + className : ''}${testId ? '#' + testId : ''}`;
  }

  private fail(kind: string, error: unknown): void {
    const detail = this.log.formatError(error);
    this.write(`ERROR ${kind} ${detail}`);
    void this.log.error(`${PREFIX} ${kind}`, error).catch(() => undefined);
    void this.log.recordException(`${PREFIX} ${kind} ${detail}`).catch(() => undefined);
  }

  private write(message: string): void {
    this.log.trace(`${PREFIX} ${message}`);
  }
}
