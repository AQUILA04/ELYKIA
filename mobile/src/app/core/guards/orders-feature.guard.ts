import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { FeatureFlagService, FeatureFlags } from '../services/feature-flag.service';

@Injectable({ providedIn: 'root' })
export class OrdersFeatureGuard implements CanActivate {
  constructor(
    private readonly featureFlags: FeatureFlagService,
    private readonly router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.featureFlags.isFeatureEnabled(FeatureFlags.OrdersManagement)) {
      return true;
    }
    return this.router.createUrlTree(['/tabs/dashboard']);
  }
}
