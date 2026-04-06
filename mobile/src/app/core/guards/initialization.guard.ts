import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Storage } from '@ionic/storage-angular';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class InitializationGuard implements CanActivate {

    constructor(private storage: Storage, private router: Router) { }

    canActivate(): Observable<boolean | UrlTree> {
        console.log('[InitializationGuard] Checking initialization status...');
        return from(this.storage.get('initialization_complete')).pipe(
            map(isComplete => {
                console.log('[InitializationGuard] Initialization complete status:', isComplete);
                if (isComplete) {
                    // If initialization is already complete, redirect to dashboard
                    console.log('[InitializationGuard] Redirecting to /tabs');
                    return this.router.createUrlTree(['/tabs']);
                }
                // Otherwise allow access to initial-loading
                console.log('[InitializationGuard] Allowing access to /initial-loading');
                return true;
            })
        );
    }
}
