import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AnalyticsReporterService } from './analytics-reporter.service';
import { CrashReporterService } from './crash-reporter.service';
import {
  JournalCategory,
  JournalEventProps,
  JournalEventType,
  JournalQueuedEvent,
} from './event-types';
import { sanitizeProps } from './sanitize';
import { TelemetryContextService } from './telemetry-context.service';

const QUEUE_KEY = 'elykia_customer_activity_queue';
const MAX_QUEUE = 500;
const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class UserJournalService implements OnDestroy {
  /** HttpClient via HttpBackend : contourne les intercepteurs (évite DI circulaire + boucles). */
  private readonly http: HttpClient;
  private readonly ctx = inject(TelemetryContextService);
  private readonly crash = inject(CrashReporterService);
  private readonly analytics = inject(AnalyticsReporterService);

  private queue: JournalQueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private appStateHandle: { remove: () => Promise<void> } | null = null;
  private visibilityHandler: (() => void) | null = null;
  private initialized = false;

  constructor() {
    this.http = new HttpClient(inject(HttpBackend));
  }

  async init(): Promise<void> {
    if (this.initialized || environment.telemetryEnabled === false) {
      return;
    }
    this.initialized = true;
    this.queue = this.loadQueue();

    await this.crash.init();
    await this.analytics.init();
    await this.crash.setCustomKey('sessionId', this.ctx.sessionId);
    await this.crash.setCustomKey('appVersion', this.ctx.appVersion);
    await this.crash.setCustomKey('deviceId', this.ctx.deviceId);
    await this.crash.setCustomKey('platform', this.ctx.platform);

    this.flushTimer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);

    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        void this.flush();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    if (Capacitor.isNativePlatform()) {
      this.appStateHandle = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          void this.flush();
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    void this.appStateHandle?.remove();
  }

  track(
    eventType: JournalEventType,
    category: JournalCategory,
    props?: JournalEventProps,
  ): void {
    if (environment.telemetryEnabled === false) {
      return;
    }

    const sanitized = sanitizeProps(props as Record<string, unknown> | undefined) ?? {};
    const message =
      typeof sanitized['message'] === 'string' ? (sanitized['message'] as string) : null;
    const httpStatus =
      typeof sanitized['httpStatus'] === 'number' ? (sanitized['httpStatus'] as number) : null;
    const screen =
      typeof sanitized['screen'] === 'string'
        ? (sanitized['screen'] as string)
        : this.ctx.getScreen();

    const event: JournalQueuedEvent = {
      eventId: this.ctx.createUuid(),
      occurredAt: new Date().toISOString(),
      category,
      eventType,
      deviceId: this.ctx.deviceId,
      sessionId: this.ctx.sessionId,
      clientId: this.ctx.getClientId(),
      phone: this.ctx.getPhoneRaw(),
      platform: this.ctx.platform,
      appVersion: this.ctx.appVersion,
      screen,
      httpStatus,
      message,
      metadata: Object.keys(sanitized).length ? sanitized : null,
    };

    this.enqueue(event);
    void this.emitToFirebase(event, sanitized);
  }

  async bindUser(clientId: string, phone: string | null): Promise<void> {
    this.ctx.setClient(clientId, phone);
    await this.crash.setUserId(clientId);
    await this.analytics.setUserId(clientId);
    await this.crash.setCustomKey('clientId', clientId);
    if (this.ctx.getPhoneMasked()) {
      await this.crash.setCustomKey('phoneMasked', this.ctx.getPhoneMasked()!);
    }
  }

  async unbindUser(): Promise<void> {
    this.ctx.clearClient();
    await this.analytics.setUserId(null);
  }

  async setScreen(screen: string): Promise<void> {
    this.ctx.setScreen(screen);
    await this.crash.setCustomKey('screen', screen);
    await this.analytics.logScreenView(screen);
  }

  async recordException(message: string): Promise<void> {
    await this.crash.recordException(message);
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0 || environment.telemetryEnabled === false) {
      return;
    }
    this.flushing = true;
    try {
      while (this.queue.length > 0) {
        const batch = this.queue.slice(0, BATCH_SIZE);
        try {
          await firstValueFrom(
            this.http.post(`${environment.apiUrl}/api/customer/auth/activity-logs`, {
              events: batch,
            }),
          );
          this.queue = this.queue.slice(batch.length);
          this.persistQueue();
        } catch {
          // Keep queue for retry; stop this flush cycle.
          break;
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  /** Exposed for unit tests. */
  getQueueSnapshot(): JournalQueuedEvent[] {
    return [...this.queue];
  }

  private enqueue(event: JournalQueuedEvent): void {
    this.queue.push(event);
    if (this.queue.length > MAX_QUEUE) {
      this.queue = this.queue.slice(this.queue.length - MAX_QUEUE);
    }
    this.persistQueue();
  }

  private async emitToFirebase(
    event: JournalQueuedEvent,
    sanitized: Record<string, unknown>,
  ): Promise<void> {
    const breadcrumb = `${event.category}:${event.eventType}` +
      (event.message ? ` ${event.message}` : '');
    await this.crash.log(breadcrumb);

    const params: Record<string, string | number | boolean> = {
      category: event.category,
      event_type: event.eventType,
      platform: event.platform,
      app_version: event.appVersion,
    };
    if (event.screen) {
      params['screen'] = event.screen;
    }
    if (this.ctx.getPhoneMasked()) {
      params['phone_masked'] = this.ctx.getPhoneMasked()!;
    }
    for (const [k, v] of Object.entries(sanitized)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        params[k.slice(0, 40)] = v;
      }
    }
    await this.analytics.logEvent(event.eventType.toLowerCase(), params);
  }

  private loadQueue(): JournalQueuedEvent[] {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as JournalQueuedEvent[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistQueue(): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // Quota exceeded — drop oldest half
      this.queue = this.queue.slice(Math.floor(this.queue.length / 2));
      try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
      } catch {
        // ignore
      }
    }
  }
}
