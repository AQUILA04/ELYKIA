import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { CustomerSessionService } from '../services/customer-session.service';

/**
 * Guard protégeant toutes les routes de l'espace client.
 * Redirige vers /auth si la session est absente ou expirée.
 * @author Francis AHONSU
 */
@Injectable({ providedIn: 'root' })
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private session: CustomerSessionService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.session.isAuthenticated) return true;
    void this.router.navigate(['/auth'], { replaceUrl: true });
    return false;
  }
}
