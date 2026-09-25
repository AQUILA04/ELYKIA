import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';

/** Soft background endpoints: 401 must not block UI with SweetAlert. */
const TOAST_ON_401_URL_MARKERS = [
  'app-notifications/unread-count'
];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private tokenStorage: TokenStorageService,
    private errorHandler: ErrorHandlerService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = req;

    const token = this.tokenStorage.getToken();
    if (token != null) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          if (this.isSoftAuthEndpoint(error.url || req.url)) {
            this.errorHandler.showErrorToast(error, 'Authentification Requise');
          } else {
            this.errorHandler.showError(error, 'Authentification Requise');
          }
        }

        return throwError(() => error);
      })
    );
  }

  private isSoftAuthEndpoint(url: string): boolean {
    return TOAST_ON_401_URL_MARKERS.some((marker) => url.includes(marker));
  }
}
