import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../service/auth.service'; // Adjust path as needed

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // Vérifier si l'utilisateur est connecté
    if (!this.authService.isLoggedIn()) {
      // Pas connecté, rediriger vers login
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }

    const currentUser = this.authService.getCurrentUser();

    // Vérifier si on a un utilisateur valide
    if (!currentUser || !currentUser.username) {
      this.router.navigate(['/login']);
      return false;
    }

    // Vérifier les rôles requis
    const requiredRoles = route.data['roles'] as Array<string>;
    if (requiredRoles && requiredRoles.length > 0) {
      // Vérifier si l'utilisateur a au moins un des rôles requis
      const userRoles = currentUser.roles || [];
      const hasRequiredRole = requiredRoles.some(role =>
        userRoles.includes(role)
      );

      if (!hasRequiredRole) {
        // L'utilisateur n'a pas le rôle requis
        this.router.navigate(['/home']);
        return false;
      }
    }

    return true;
  }
}
