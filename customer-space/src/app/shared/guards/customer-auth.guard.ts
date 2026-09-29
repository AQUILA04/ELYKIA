import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, NavigationExtras, Router, RouterStateSnapshot } from '@angular/router';
import { CustomerSessionService } from '../services/customer-session.service';
import { RETURN_URL_PARAM, sanitizeReturnUrl } from '../utils/return-url';

/**
 * Guard protégeant toutes les routes de l'espace client.
 * Redirige vers /auth si la session est absente ou expirée, en conservant
 * la page demandée (`returnUrl`) pour y revenir après connexion.
 * @author Francis AHONSU
 */
@Injectable({ providedIn: 'root' })
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private session: CustomerSessionService,
    private router: Router
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.session.isAuthenticated) return true;
    const extras: NavigationExtras = { replaceUrl: true };
    const returnUrl = sanitizeReturnUrl(state.url);
    if (returnUrl) {
      extras.queryParams = { [RETURN_URL_PARAM]: returnUrl };
    }
    void this.router.navigate(['/auth'], extras);
    return false;
  }
}
