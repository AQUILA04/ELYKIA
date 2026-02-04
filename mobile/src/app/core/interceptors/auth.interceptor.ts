import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const user = this.authService.currentUser;
    if (user && user.accessToken) {
      const authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${user.accessToken}`
        }
      });
      return next.handle(authReq);
    }
    return next.handle(request);
  }
}
