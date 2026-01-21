// import { Component, OnInit } from '@angular/core';
// import { Router, NavigationEnd } from '@angular/router';
// import { NgxPermissionsService } from 'ngx-permissions';
// import { TokenStorageService } from './shared/service/token-storage.service';
// @Component({
//   selector: 'app-root',
//   templateUrl: './app.component.html',
//   styleUrls: ['./app.component.scss']
// })
// export class AppComponent implements OnInit {
//   title(title: any) {
//     throw new Error('Method not implemented.');
//   }
//   showHeaderAndSidebar: boolean = true;
//   isLoginPage: boolean = false;

//   constructor(
//     private router: Router,
//     private permissionsService : NgxPermissionsService,
//     private tokenStorageService : TokenStorageService

//   ) {}

//   ngOnInit(): void {
//         this.router.events.subscribe(event => {
//       if (event instanceof NavigationEnd) {
//         this.showHeaderAndSidebar = !['/login', '/register'].includes(event.urlAfterRedirects);
//       }
//     });
//     const currentUser = JSON.parse(this.tokenStorageService.getUser());
//     console.log(currentUser);
//     this.permissionsService.loadPermissions(currentUser.roles);

//   }
//   isLicensePage(): boolean {
//     return this.router.url === '/license';
//   }
// }
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { NgxPermissionsService } from 'ngx-permissions';
import { TokenStorageService } from './shared/service/token-storage.service';
import { AuthService } from './auth/service/auth.service';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { LayoutService } from './shared/service/layout.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  showHeaderAndSidebar: boolean = true;
  private destroy$ = new Subject<void>();


  constructor(
    private router: Router,
    private permissionsService: NgxPermissionsService,
    private tokenStorageService: TokenStorageService,
    private authService: AuthService,
    public layoutService: LayoutService
  ) { }

  ngOnInit(): void {

    this.setupSessionSync();

    // Vérifier l'authentification à chaque navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.checkAuthentication();
    });
    // Gère l'affichage de la barre de navigation et du menu latéral
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const hiddenRoutes = ['/login', '/register', '/license'];
        this.showHeaderAndSidebar = !hiddenRoutes.includes(event.urlAfterRedirects);
      }
    });

    // Charge les permissions de l'utilisateur
    this.loadUserPermissions();
  }

  loadUserPermissions(): void {
    // 1. Récupérer l'utilisateur (qui est une chaîne JSON)
    const userString = this.tokenStorageService.getUser();

    if (userString) {
      // 2. Convertir la chaîne JSON en objet JavaScript
      const currentUser = this.authService.getCurrentUser();

      // 3. Charger les permissions. Utiliser un tableau vide si 'roles' n'existe pas.
      this.permissionsService.loadPermissions(currentUser.roles || []);

    } else {
      // 4. Si aucun utilisateur n'est connecté, vider toutes les permissions
      this.permissionsService.flushPermissions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Configure la synchronisation de session entre onglets
   */
  private setupSessionSync(): void {
    // Écouter les événements de déconnexion depuis d'autres onglets
    window.addEventListener('storage', (event) => {
      if (event.key === 'logout-event') {
        // Un autre onglet s'est déconnecté
        this.handleLogoutEvent();
      }
    });

    // Écouter la fermeture de l'onglet
    window.addEventListener('beforeunload', () => {
      // Ne supprimer la session que si c'est le dernier onglet
      this.handleTabClose();
    });
  }

  /**
   * Vérifie l'authentification de l'utilisateur
   */
  private checkAuthentication(): void {
    const currentUrl = this.router.url;
    const publicRoutes = ['/login', '/license'];

    // Si on est sur une route publique, ne rien faire
    if (publicRoutes.some(route => currentUrl.startsWith(route))) {
      return;
    }

    // Vérifier si l'utilisateur est connecté
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: currentUrl }
      });
    }
  }

  /**
   * Gère l'événement de déconnexion depuis un autre onglet
   */
  private handleLogoutEvent(): void {
    if (this.router.url !== '/login') {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Gère la fermeture de l'onglet
   */
  private handleTabClose(): void {
    // Compter les onglets ouverts
    const openTabsCount = this.getOpenTabsCount();

    // Si c'est le dernier onglet, déclencher la déconnexion
    if (openTabsCount <= 1) {
      localStorage.setItem('logout-event', Date.now().toString());
    }
  }

  /**
   * Compte le nombre d'onglets ouverts
   */
  private getOpenTabsCount(): number {
    // Utiliser une technique de comptage via localStorage
    // Cette méthode est approximative mais suffisante
    const tabId = sessionStorage.getItem('tabId') || this.generateTabId();
    sessionStorage.setItem('tabId', tabId);

    // Stocker l'ID de l'onglet avec un timestamp
    const tabs = this.getActiveTabs();
    tabs[tabId] = Date.now();
    localStorage.setItem('active-tabs', JSON.stringify(tabs));

    // Nettoyer les onglets inactifs (plus de 5 secondes)
    const now = Date.now();
    const activeTabs = Object.entries(tabs).filter(([_, timestamp]) => {
      return (now - (timestamp as number)) < 5000;
    });

    return activeTabs.length;
  }

  /**
   * Récupère les onglets actifs
   */
  private getActiveTabs(): { [key: string]: number } {
    try {
      const tabs = localStorage.getItem('active-tabs');
      return tabs ? JSON.parse(tabs) : {};
    } catch {
      return {};
    }
  }

  /**
   * Génère un ID unique pour l'onglet
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cette méthode n'est plus nécessaire si elle est gérée par le routeur ci-dessus
  // isLicensePage(): boolean {
  //   return this.router.url === '/license';
  // }
}
