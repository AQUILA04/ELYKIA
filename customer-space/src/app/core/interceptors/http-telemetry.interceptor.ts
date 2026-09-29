import { Injectable, inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { CustomerSessionService } from '../../shared/services/customer-session.service';
import { TelemetryContextService } from '../telemetry/telemetry-context.service';
import { UserJournalService } from '../telemetry/user-journal.service';

const ACTIVITY_LOG_PATH = '/api/customer/auth/activity-logs';

/**
 * Ajoute les en-têtes de corrélation et journalise les erreurs HTTP / 401.
 */
@Injectable()
export class HttpTelemetryInterceptor implements HttpInterceptor {
  private readonly ctx = inject(TelemetryContextService);
  private readonly journal = inject(UserJournalService);
  private readonly session = inject(CustomerSessionService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const isActivityLog = req.url.includes(ACTIVITY_LOG_PATH);
    const started = Date.now();
    const requestId = this.ctx.createUuid();

    const headers: Record<string, string> = {
      'X-Elykia-Device-Id': this.ctx.deviceId,
      'X-Elykia-Session-Id': this.ctx.sessionId,
      'X-Request-Id': requestId,
      'X-Elykia-Platform': this.ctx.platform,
      'X-Elykia-App-Version': this.ctx.appVersion,
    };

    const cloned = req.clone({ setHeaders: headers });

    return next.handle(cloned).pipe(
      catchError((error: unknown) => {
        if (!isActivityLog) {
          this.reportHttpError(cloned, error, Date.now() - started);
        }
        return throwError(() => error);
      }),
    );
  }

  private reportHttpError(req: HttpRequest<unknown>, error: unknown, durationMs: number): void {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    const path = this.normalizePath(req.url);
    const message =
      error instanceof HttpErrorResponse
        ? `${req.method} ${path} → ${status}`
        : `${req.method} ${path} → network error`;

    if (status === 401 && this.session.isAuthenticated) {
      this.journal.track('SESSION_EXPIRED', 'AUTH', {
        message,
        httpStatus: status,
        method: req.method,
        path,
        durationMs,
      });
    }

    this.journal.track('HTTP_ERROR', 'ERROR', {
      message,
      httpStatus: status,
      method: req.method,
      path,
      durationMs,
    });
  }

  private normalizePath(url: string): string {
    try {
      const u = new URL(url, 'https://local.invalid');
      return u.pathname.replace(/\/\d+/g, '/:id');
    } catch {
      return url.split('?')[0].replace(/\/\d+/g, '/:id');
    }
  }
}
