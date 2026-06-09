import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { FeatureFlagService, FeatureFlags } from '../service/feature-flag.service';

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagGuard implements CanActivate {

  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const feature = route.data['featureFlag'] as FeatureFlags | undefined;
    if (!feature) {
      return true;
    }
    if (this.featureFlagService.isFeatureEnabled(feature)) {
      return true;
    }
    return this.router.createUrlTree(['/home']);
  }
}
