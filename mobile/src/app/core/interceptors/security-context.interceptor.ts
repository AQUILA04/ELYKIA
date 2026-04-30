import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { LoggerService } from '../services/logger.service';

/**
 * Intercepts outgoing mutating requests to stock endpoints and automatically
 * injects the current user's `commercialUsername` into the request body.
 *
 * Applies to: POST, PUT, PATCH (DELETE with body is intentionally excluded
 * as the current API contract does not use body payloads on DELETE verbs).
 *
 * Target endpoints:
 *   - /api/stock-requests
 *   - /api/stock-returns
 *   - /api/v1/stock-tontine-*
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
        const msg = `[SecurityContextInterceptor] WARNING: commercialUsername could not be injected — no authenticated user found for ${request.method} ${request.url}`;
        this.log.log(msg);
        console.log(msg);
        // Pass through without mutation; the backend will reject with 401/403 if authentication is required.
        return next.handle(request);
      }

      // Clone the request body and inject commercialUsername.
      let body = request.body;
      if (body && typeof body === 'object') {
        body = { ...body, commercialUsername: username };
      } else {
        body = { commercialUsername: username };
      }

      const modifiedRequest = request.clone({ body });
      return next.handle(modifiedRequest);
    }

    return next.handle(request);
  }
}
