import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
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
  ) {}

  canActivate(): Observable<boolean> {
    return this.store.select(selectIsLoggedIn).pipe(
      take(1),
      switchMap(isLoggedIn => {
        if (!isLoggedIn) {
          this.router.navigate(['/login']);
          return of(false);
        }
        return from(this.storage.get('initialization_complete')).pipe(
          map(initializationComplete => {
            if (!initializationComplete) {
              this.router.navigate(['/login']);
              return false;
            }
            return true;
          })
        );
      })
    );
  }
}