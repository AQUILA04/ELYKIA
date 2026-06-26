import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of, from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { selectIsLoggedIn } from '../../store/auth/auth.selectors';
import { Storage } from '@ionic/storage-angular';
import { DatabaseService } from '../services/database.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private store: Store,
    private router: Router,
    private storage: Storage,
    private dbService: DatabaseService
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
            if (!this.dbService.isReady() || !initializationComplete) {
              console.log('[AuthGuard] DB not ready or not initialized, redirecting to initial-loading.');
              return this.router.createUrlTree(['/initial-loading']);
            }
            return true;
          })
        );
      })
    );
  }
}