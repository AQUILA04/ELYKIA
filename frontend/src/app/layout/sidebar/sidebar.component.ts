import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { NgxPermissionsService } from 'ngx-permissions';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AuthService } from "../../auth/service/auth.service";
import { LayoutService } from 'src/app/shared/service/layout.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  isCaisseOpen: boolean = false;
  activeRoute: string = '';

  isRouteActive(route: string): boolean {
    // Gestion spécifique pour le menu Caisse et ses sous-menus
    if (route === '/open-cashDesk') {
      return this.activeRoute.startsWith('/open-cashDesk') || this.activeRoute.startsWith('/daily-operation');
    }

    // Pour toutes les autres routes, utiliser une correspondance exacte ou avec un slash
    // Cela évite les conflits entre routes similaires
    return this.activeRoute === route || this.activeRoute === route + '/' ||
      (this.activeRoute.startsWith(route + '/') && !this.hasConflictingRoute(route));
  }

  // Méthode pour détecter les routes qui peuvent entrer en conflit
  private hasConflictingRoute(route: string): boolean {
    const allRoutes = [
      '/home', '/accounting-day', '/open-cashDesk', '/daily-operation',
      '/list', '/localitylist', '/credit-list', '/out-list', '/tontine-list',
      '/accountlist', '/client-list', '/report', '/inventory', '/gestion-list',
      '/operation-list', '/deposit-list', '/user-list', '/commercial-list'
    ];

    // Vérifier si une autre route commence par la même base
    return allRoutes.some(r => r !== route && r.startsWith(route) && r !== route + '/');
  }

  onCaisseClick() {
    if (this.activeRoute.startsWith('/open-cashDesk') || this.activeRoute.startsWith('/daily-operation')) {
      this.isCaisseOpen = !this.isCaisseOpen;
    } else {
      this.router.navigate(['/open-cashDesk']);
      this.isCaisseOpen = true;
    }
  }

  constructor(private router: Router,
    private tokenStorageService: TokenStorageService,
    private permissionsService: NgxPermissionsService,
    private tokenStorage: TokenStorageService,
    private authService: AuthService,
    public layoutService: LayoutService) {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.activeRoute = event.url;
      // Gérer l'état de isCaisseOpen en fonction de la route active
      if (this.activeRoute.startsWith('/open-cashDesk') || this.activeRoute.startsWith('/daily-operation')) {
        this.isCaisseOpen = true;
      } else {
        this.isCaisseOpen = false;
      }
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.permissionsService.loadPermissions(currentUser.roles);
    this.isCaisseOpen = false;

    // Initialiser activeRoute avec la route actuelle au démarrage
    this.activeRoute = this.router.url;
  }


  confirmLogout(): void {
    Swal.fire({
      title: '<span style="font-size: 22px; font-weight: 600; color: #333;">Êtes-vous sûr ?</span>',
      html: '<span style="font-size: 16px; color: #555;">Vous êtes sur le point de vous déconnecter.</span>',
      icon: 'question', // Ou 'info', 'warning', ou une icône personnalisée via imageUrl
      // imageUrl: 'path/to/your/custom-logout-icon.svg', // Exemple avec icône personnalisée
      // imageWidth: 80,
      // imageHeight: 80,
      showCancelButton: true,
      confirmButtonText: 'Oui, déconnectez-moi !',
      cancelButtonText: 'Annuler',
      buttonsStyling: false, // Important pour appliquer nos propres classes
      customClass: {
        popup: 'custom-swal-popup',
        title: 'custom-swal-title',
        htmlContainer: 'custom-swal-html-container',
        confirmButton: 'custom-swal-confirm-button btn btn-primary',
        cancelButton: 'custom-swal-cancel-button btn btn-outline-secondary'
      },
      reverseButtons: true,
      focusCancel: true, // Met le focus sur le bouton Annuler par défaut
      backdrop: `
        rgba(0,0,123,0.4)
        url("assets/images/nyan-cat.gif")
        left top
        no-repeat
      ` // Optionnel: pour un fond amusant ou thématique
    }).then((result) => {
      if (result.isConfirmed) {
        this.logout();
      }
    });
  }

  logout(): void {
    // Clear user data from localStorage or any other storage
    localStorage.removeItem('currentUser');
    this.tokenStorageService.signOut();
    this.router.navigate(['/login']);
  }

  closeSidebar() {
    this.layoutService.closeSidebar();
  }
}
