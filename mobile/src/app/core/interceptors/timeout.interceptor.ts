import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

const DEFAULT_TIMEOUT = 30000; // 30 seconds

@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(timeout(DEFAULT_TIMEOUT));
  }
}
