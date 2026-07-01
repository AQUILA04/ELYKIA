import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const DEVICE_NOT_AUTHORIZED_CODE = 'DEVICE_NOT_AUTHORIZED';

@Injectable()
export class DeviceAuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (this.isDeviceNotAuthorizedError(error)) {
          void this.authService.handleDeviceNotAuthorized();
        }
        return throwError(() => error);
      })
    );
  }

  private isDeviceNotAuthorizedError(error: HttpErrorResponse): boolean {
    if (error.status !== 403) {
      return false;
    }
    const body = error.error;
    if (!body) {
      return false;
    }
    if (typeof body === 'string') {
      return body.includes(DEVICE_NOT_AUTHORIZED_CODE);
    }
    return body.code === DEVICE_NOT_AUTHORIZED_CODE;
  }
}
