import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RmScopeService } from '../services/rm/rm-scope.service';

@Injectable({ providedIn: 'root' })
export class RmPlanGuard implements CanActivate {
  constructor(
    private readonly rmScope: RmScopeService,
    private readonly router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return from(this.rmScope.hasActivePlanWithPack()).pipe(
      map(ok => (ok ? true : this.router.createUrlTree(['/rm/plan'])))
    );
  }
}
