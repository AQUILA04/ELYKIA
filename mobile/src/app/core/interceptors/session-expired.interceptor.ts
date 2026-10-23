import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { NEVER, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Préfixes publics : un 401 y signifie un refus métier (identifiants, sonde,
 * contrôle de version), pas une session déjà ouverte qui vient d'être rejetée.
 */
export const SESSION_EXPIRED_EXCLUSIONS = [
  '/api/auth/',
  '/api/customer/auth/',
  '/api/public/',
  '/actuator/',
  '/api/v1/mobile/app/release/',
  '/api/v1/customer/app/release/',
];

export function isRejectedAuthenticatedCall(url: string, status: number): boolean {
  if (status !== 401) {
    return false;
  }
  return !SESSION_EXPIRED_EXCLUSIONS.some(fragment => url.includes(fragment));
}

/**
 * Doit rester l'intercepteur le plus extérieur (déclaré avant le timeout).
 * Sinon un 401 avalé par NEVER serait converti en erreur de délai 30 s plus tard.
 */
@Injectable()
export class SessionExpiredInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse)) {
          return throwError(() => error);
        }
        // request.url : l'URL d'origine. error.url est réécrite par CapacitorHttp
        // (localhost/_capacitor_http_interceptor_), donc inutilisable pour le filtre.
        if (isRejectedAuthenticatedCall(request.url, error.status) && this.authService.handleUnauthorized()) {
          return NEVER;
        }
        return throwError(() => error);
      })
    );
  }
}
