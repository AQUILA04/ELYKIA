import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, EMPTY } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { HealthCheckService } from '../services/health-check.service';

@Injectable()
export class NetworkErrorHandlerInterceptor implements HttpInterceptor {

  constructor(private healthCheckService: HealthCheckService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0 || error.status === 503) {
          // Guard: do not intercept the health-check call itself to prevent infinite recursion.
          if (request.url.includes('/actuator/health')) {
            return throwError(() => error);
          }
          return this.healthCheckService.pingBackend().pipe(
            switchMap(isOnline => {
              if (!isOnline) {
                // User is navigated away — complete the stream rather than propagating
                // the error simultaneously, which would cause duplicate error handling.
                this.router.navigate(['/server-unavailable']);
                return EMPTY;
              }
              // Backend is reachable — transient error, propagate to caller.
              return throwError(() => error);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
}
