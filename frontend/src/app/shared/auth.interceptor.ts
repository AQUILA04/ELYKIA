import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { ErrorHandlerService } from 'src/app/shared/service/error-handler.service';


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
        // Gérer les erreurs critiques au niveau global
        if (error.status === 401) {
          // Afficher le message d'erreur complet du backend pour les erreurs 401
          this.errorHandler.showError(error, 'Authentification Requise');
          // Optionnel: déconnexion automatique
          // this.tokenStorage.signOut();
          // window.location.reload();
        }
        
        // Pour toutes les autres erreurs, on laisse les composants les gérer
        // mais on s'assure que l'erreur complète est disponible
        return throwError(() => error);
      })
    );
  }
}

