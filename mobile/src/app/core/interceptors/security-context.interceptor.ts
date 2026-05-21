import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';

/**
 * Injecte le `collector` (username commercial) dans les corps des requêtes stock mutantes,
 * conformément aux entités backend (StockRequest.collector, StockReturn.collector, etc.).
 */
@Injectable()
export class SecurityContextInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private log: LoggerService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const targetUrls = [
      '/api/stock-requests',
      '/api/stock-returns',
      '/api/v1/stock-tontine-'
    ];

    const isTargetUrl = targetUrls.some(url => request.url.includes(url));
    const isMutatingMethod = request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH';

    if (isTargetUrl && isMutatingMethod) {
      const username = this.authService.currentUser?.username;

      if (!username) {
        const msg = `[SecurityContextInterceptor] WARNING: collector could not be injected — no authenticated user for ${request.method} ${request.url}`;
        this.log.log(msg);
        return next.handle(request);
      }

      const body = this.injectCollector(request.body, username);
      return next.handle(request.clone({ body }));
    }

    return next.handle(request);
  }

  private injectCollector(body: unknown, username: string): unknown {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { collector: username };
    }

    const record = { ...(body as Record<string, unknown>) };

    // StockRequestCreateDto : { request: { items, collector? }, forNextMonth? }
    if (record['request'] && typeof record['request'] === 'object' && !Array.isArray(record['request'])) {
      const requestBody = { ...(record['request'] as Record<string, unknown>) };
      if (!requestBody['collector']) {
        requestBody['collector'] = username;
      }
      record['request'] = requestBody;
    } else if (!record['collector']) {
      record['collector'] = username;
    }

    return record;
  }
}
