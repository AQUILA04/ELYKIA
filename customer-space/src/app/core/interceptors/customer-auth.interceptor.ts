import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CustomerSessionService } from '../../shared/services/customer-session.service';

/**
 * Intercepteur HTTP — injecte le Bearer token du client dans chaque requête.
 * @author Francis AHONSU
 */
@Injectable()
export class CustomerAuthInterceptor implements HttpInterceptor {
  constructor(private session: CustomerSessionService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.session.currentSession?.token;
    if (token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
    return next.handle(req);
  }
}
