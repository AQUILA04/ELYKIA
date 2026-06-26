import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Storage } from '@ionic/storage-angular';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { DatabaseService } from '../services/database.service';

@Injectable({
    providedIn: 'root'
})
export class InitializationGuard implements CanActivate {

    constructor(
        private storage: Storage,
        private router: Router,
        private dbService: DatabaseService
    ) { }

    canActivate(): Observable<boolean | UrlTree> {
        console.log('[InitializationGuard] Checking initialization status...');
        return from(this.storage.get('initialization_complete')).pipe(
            switchMap(isComplete => {
                if (isComplete && !this.dbService.isReady()) {
                    // Après mise à jour APK ou échec SQLite : le flag est obsolète, forcer la ré-init
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
    }
}
