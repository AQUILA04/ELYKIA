import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of, from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { selectIsLoggedIn, selectAuthUser } from '../../store/auth/auth.selectors';
import { Storage } from '@ionic/storage-angular';
import { DatabaseService } from '../services/database.service';
import { FeatureFlagService, FeatureFlags } from '../services/feature-flag.service';
import { canAccessRecoveryManagerMobile, hasRecoveryManagerProfil } from '../utils/rm-user.util';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private store: Store,
    private router: Router,
    private storage: Storage,
    private dbService: DatabaseService,
    private featureFlags: FeatureFlagService
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.store.select(selectAuthUser).pipe(
      take(1),
      switchMap(user => this.store.select(selectIsLoggedIn).pipe(
        take(1),
        switchMap(isLoggedIn => {
          if (!isLoggedIn) {
            return of(this.router.createUrlTree(['/login']));
          }

          if (state.url.includes('change-password')) {
            return of(true);
          }

          if (user?.mustChangePassword) {
            return of(this.router.createUrlTree(['/change-password']));
          }

          const isRm = canAccessRecoveryManagerMobile(user, this.featureFlags);

          if (isRm) {
            if (state.url.startsWith('/rm')) {
              return of(true);
            }
            return of(this.router.createUrlTree(['/rm/plan']));
          }

          if (state.url.includes('initial-loading')) {
            return of(true);
          }

          if (state.url.startsWith('/rm')) {
            return of(this.router.createUrlTree(['/tabs/dashboard']));
          }

          return from(this.storage.get('initialization_complete')).pipe(
            map(initializationComplete => {
              if (!this.dbService.isReady() || !initializationComplete) {
                return this.router.createUrlTree(['/initial-loading']);
              }
              return true;
            })
          );
        })
      ))
    );
  }
}
