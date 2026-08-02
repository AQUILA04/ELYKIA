import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { NgxPermissionsService } from 'ngx-permissions';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrlLogin = `${environment.apiUrl}/api/auth/signin`;
  private currentUserSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  public currentUser: Observable<any> = this.currentUserSubject.asObservable();

  constructor(
    private tokenStorageService: TokenStorageService,
    private http: HttpClient,
    private permissionsService: NgxPermissionsService,
    private alertService: AlertService,
    private router: Router
  ) {
    this.initializeSessionManagement();
  }

  /**
   * Initialise la vérification de session via localStorage
   */
  private initializeSessionManagement(): void {
    // Charger l'utilisateur actuel au démarrage
    const user = this.tokenStorageService.getUser();
    if (user && Object.keys(user).length > 0) {
      this.currentUserSubject.next(user);
    }

    // Écouter les changements dans localStorage pour synchroniser les onglets
    window.addEventListener('storage', (event) => {
      // Si le token ou l'utilisateur change (connexion/déconnexion dans un autre onglet)
      if (event.key === environment.config.authtoken || event.key === environment.config.authuser) {
        this.syncSessionState();
      }
    });
  }

  /**
   * Synchronise l'état de la session avec le stockage local
   */
  private syncSessionState(): void {
    const token = this.tokenStorageService.getToken();
    const user = this.tokenStorageService.getUser();

    if (!token || !user || Object.keys(user).length === 0) {
      // Déconnexion détectée
      this.currentUserSubject.next(null);
      this.permissionsService.flushPermissions();
      // Rediriger vers login si on n'y est pas déjà
      if (this.router.url !== '/login') {
        this.router.navigate(['/login']);
      }
    } else {
      // Nouvelle connexion ou mise à jour détectée
      // Vérifier si l'utilisateur a changé pour éviter des mises à jour inutiles
      const currentUser = this.currentUserSubject.value;
      if (!currentUser || currentUser.username !== user.username) {
        this.currentUserSubject.next(user);
        this.setPermissions(user.roles || []);

        // Si on est sur la page de login, rediriger vers home
        if (this.router.url === '/login') {
          if (user.mustChangePassword) {
            this.router.navigate(['/user/change-password'], { queryParams: { forced: 'true' } });
          } else {
            const returnUrl = this.router.routerState.snapshot.root.queryParams['returnUrl'] || '/home';
            this.router.navigateByUrl(returnUrl);
          }
        }
      }
    }
  }

  setPermissions(roles: string[] | null | undefined): void {
    this.permissionsService.loadPermissions(Array.isArray(roles) ? roles : []);
  }

  /** Hydrate session after mobile SSO (token already saved). */
  hydrateSession(user: any): void {
    this.currentUserSubject.next(user);
    this.setPermissions(user?.roles);
  }

  loadPermissionsFromCurrentUser(): void {
    const user = this.getCurrentUser();
    this.setPermissions(user?.roles);
  }

  hasPermission(permission: string): Promise<boolean> {
    return this.permissionsService.hasPermission(permission);
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user && user.roles && user.roles.includes(role);
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(this.apiUrlLogin, { username, password }).pipe(
      tap(response => {
        // TokenStorageService s'occupe de localStorage, ce qui déclenchera l'événement storage dans les autres onglets
        this.currentUserSubject.next(response);
      }),
      catchError(error => {
        console.error('Erreur de connexion', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    // Nettoyer toutes les données via le service
    this.tokenStorageService.signOut();
    this.currentUserSubject.next(null);
    this.permissionsService.flushPermissions();

    // Rediriger vers login
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = this.tokenStorageService.getToken();
    if (token && this.isTokenExpired(token)) {
      this.tokenStorageService.signOut();
      this.currentUserSubject.next(null);
      this.permissionsService.flushPermissions();
      return false;
    }
    return !!token;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);

      if (!payload.exp) {
        return false;
      }

      return Math.floor((new Date).getTime() / 1000) >= payload.exp;
    } catch (e) {
      return true;
    }
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value || this.tokenStorageService.getUser();
  }

  getUsername(): string | null {
    const user = this.getCurrentUser();
    return user ? user.username : null;
  }

  mustChangePassword(): boolean {
    const user = this.getCurrentUser();
    return user?.mustChangePassword === true;
  }

  clearMustChangePasswordFlag(): void {
    const user = this.getCurrentUser();
    if (!user) {
      return;
    }
    const updated = { ...user, mustChangePassword: false };
    this.tokenStorageService.saveUser(updated);
    this.currentUserSubject.next(updated);
  }
}
