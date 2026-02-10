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
        return from(this.storage.get('initialization_complete')).pipe(
            map(isComplete => {
                if (isComplete) {
                    // If initialization is already complete, redirect to dashboard
                    return this.router.createUrlTree(['/tabs']);
                }
                // Otherwise allow access to initial-loading
                return true;
            })
        );
    }
}
