import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { DeviceIdentityService } from '../services/device-identity.service';
import { FeatureFlagService, FeatureFlags } from '../services/feature-flag.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private deviceIdentityService: DeviceIdentityService,
    private featureFlagService: FeatureFlagService,
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const user = this.authService.currentUser;
    const headers: Record<string, string> = {};

    if (user?.accessToken) {
      headers['Authorization'] = `Bearer ${user.accessToken}`;
    }

    if (this.featureFlagService.isFeatureEnabled(FeatureFlags.MobileDeviceRestriction)) {
      const deviceId = this.deviceIdentityService.getCachedDeviceId();
      if (deviceId) {
        headers['X-Device-Id'] = deviceId;
      }
    }

    if (Object.keys(headers).length > 0) {
      return next.handle(request.clone({ setHeaders: headers }));
    }

    return next.handle(request);
  }
}
