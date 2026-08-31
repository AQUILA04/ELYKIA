import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { FeatureFlagService, FeatureFlags } from '../services/feature-flag.service';
import { hasRecoveryManagerProfil } from '../utils/rm-user.util';

@Injectable({ providedIn: 'root' })
export class RmProfilGuard implements CanActivate {
  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly featureFlags: FeatureFlagService
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    if (!this.featureFlags.isFeatureEnabled(FeatureFlags.RecoveryManagerMobile)) {
      return of(this.router.createUrlTree(['/login']));
    }

    return this.store.select(selectAuthUser).pipe(
      take(1),
      map(user => {
        if (hasRecoveryManagerProfil(user)) {
          return true;
        }
        return this.router.createUrlTree(['/tabs/dashboard']);
      })
    );
  }
}
