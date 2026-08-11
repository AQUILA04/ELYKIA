import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { RECOVERY_MANAGER_PROFIL } from '../../models/auth.model';
import { FeatureFlagService, FeatureFlags } from '../services/feature-flag.service';

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
        if (user?.profil === RECOVERY_MANAGER_PROFIL) {
          return true;
        }
        return this.router.createUrlTree(['/tabs/dashboard']);
      })
    );
  }
}
