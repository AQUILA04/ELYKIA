import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Storage } from '@ionic/storage-angular';
import { Store } from '@ngrx/store';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { DatabaseService } from '../services/database.service';
import { selectAuthUser } from '../../store/auth/auth.selectors';
import { canAccessRecoveryManagerMobile } from '../utils/rm-user.util';

@Injectable({
    providedIn: 'root'
})
export class InitializationGuard implements CanActivate {

    constructor(
        private storage: Storage,
        private router: Router,
        private dbService: DatabaseService,
        private store: Store
    ) { }

    canActivate(): Observable<boolean | UrlTree> {
        console.log('[InitializationGuard] Checking initialization status...');
        return this.store.select(selectAuthUser).pipe(
            take(1),
            switchMap(user => {
                if (canAccessRecoveryManagerMobile(user)) {
                    console.log('[InitializationGuard] Recovery manager — redirect /rm/plan');
                    return of(this.router.createUrlTree(['/rm/plan']));
                }

                return from(this.storage.get('initialization_complete')).pipe(
                    switchMap(isComplete => {
                        if (isComplete && !this.dbService.isReady()) {
                            console.log('[InitializationGuard] DB not ready despite initialization_complete — clearing flag');
                            return from(this.storage.remove('initialization_complete')).pipe(
                                map(() => true as boolean | UrlTree)
                            );
                        }

                        if (isComplete && this.dbService.isReady()) {
                            console.log('[InitializationGuard] Redirecting to /tabs');
                            return of(this.router.createUrlTree(['/tabs']));
                        }

                        console.log('[InitializationGuard] Allowing access to /initial-loading');
                        return of(true);
                    })
                );
            })
        );
    }
}
