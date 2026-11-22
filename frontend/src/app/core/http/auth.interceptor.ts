import { Injectable, Injector } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/service/auth.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { SessionExpiryState } from 'src/app/shared/service/session-expiry.state';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';

/** Identifiants refusés : le formulaire de connexion affiche l'erreur, sans fermer une session. */
const PUBLIC_AUTH_URL_MARKERS = [
  '/api/auth/signin',
  '/api/auth/signup'
];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  /** Jeton déjà traité : une rafale de 401 ne déconnecte qu'une fois. */
  private handledToken: string | null = null;

  constructor(
    private tokenStorage: TokenStorageService,
    private injector: Injector
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
          const sentToken = this.bearerToken(authReq);
          if (sentToken && this.shouldEndSession(authReq, sentToken)) {
            this.endSessionOnce(sentToken);
          }
        }
        return throwError(() => error);
      })
    );
  }

  private bearerToken(req: HttpRequest<any>): string | null {
    const header = req.headers.get('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    const token = header.substring('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }

  private shouldEndSession(req: HttpRequest<any>, sentToken: string): boolean {
    const url = req.url || '';
    if (PUBLIC_AUTH_URL_MARKERS.some((marker) => url.includes(marker))) {
      return false;
    }

    const current = this.tokenStorage.getToken();
    // Une reconnexion a déjà remplacé le jeton : ce 401 appartient à l'ancienne session.
    if (current && current !== sentToken) {
      return false;
    }

    const path = this.injector.get(Router).url.split('?')[0];
    if ((path === '/login' || path.startsWith('/login/')) && !current) {
      return false;
    }

    return true;
  }

  private endSessionOnce(sentToken: string): void {
    if (this.handledToken === sentToken) {
      return;
    }
    this.handledToken = sentToken;

    this.injector.get(SessionExpiryState).begin();
    this.injector.get(AlertService).notifySessionExpired();
    this.injector.get(AuthService).logout();
  }
}
