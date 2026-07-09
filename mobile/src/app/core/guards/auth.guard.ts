import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of, from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { selectIsLoggedIn, selectAuthUser } from '../../store/auth/auth.selectors';
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
    return this.store.select(selectAuthUser).pipe(
      take(1),
      switchMap(user => this.store.select(selectIsLoggedIn).pipe(
        take(1),
        switchMap(isLoggedIn => {
          if (!isLoggedIn) {
            return of(this.router.createUrlTree(['/login']));
          }

          if (state.url.includes('initial-loading') || state.url.includes('change-password')) {
            return of(true);
          }

          if (user?.mustChangePassword) {
            return of(this.router.createUrlTree(['/change-password']));
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