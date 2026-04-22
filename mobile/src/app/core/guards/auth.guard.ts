import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of, from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { selectIsLoggedIn } from '../../store/auth/auth.selectors';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private store: Store,
    private router: Router,
    private storage: Storage
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    return this.store.select(selectIsLoggedIn).pipe(
      take(1),
      switchMap(isLoggedIn => {
        if (!isLoggedIn) {
          return of(this.router.createUrlTree(['/login']));
        }

        // Allow access to initial-loading page without initialization check
        if (state.url.includes('initial-loading')) {
          console.log('[AuthGuard] Allowing access to initial-loading.');
          return of(true);
        }

        return from(this.storage.get('initialization_complete')).pipe(
          map(initializationComplete => {
            if (!initializationComplete) {
              console.log('[AuthGuard] Not initialized, redirecting to initial-loading.');
              // If not initialized and trying to access restricted area, redirect to initial-loading
              return this.router.createUrlTree(['/initial-loading']);
            }
            return true;
          })
        );
      })
    );
  }
}