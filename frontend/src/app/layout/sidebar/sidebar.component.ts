import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { NgxPermissionsService } from 'ngx-permissions';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AuthService } from '../../auth/service/auth.service';
import { LayoutService } from 'src/app/shared/service/layout.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from '../../shared/models/user-profile.enum';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  // ── Submenu open state ──────────────────────────────────────
  isCaisseOpen         = false;
  isSecurityOpen       = false;
  isStockOpen          = false;
  isStockTontineOpen   = false;
  isVentesOpen         = false;
  isTontineOpen        = false;
  isConfigurationOpen  = false;

  activeRoute = '';

  // ── User display ────────────────────────────────────────────
  username = '';
  userRole = '';

  // ── Constructor ─────────────────────────────────────────────
  constructor(
    private router: Router,
    private tokenStorageService: TokenStorageService,
    private permissionsService: NgxPermissionsService,
    private tokenStorage: TokenStorageService,
    private authService: AuthService,
    public layoutService: LayoutService,
    private userService: UserService
  ) {
    // Track route changes to update active state and submenu open/close
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.activeRoute = event.url;
      this.syncSubmenusToRoute();
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    this.permissionsService.loadPermissions(currentUser.roles);

    // Populate user display info
    this.username = this.authService.getUsername() ?? '';
    this.userRole = this.resolveRoleLabel(currentUser.roles ?? []);

    // Init route tracking
    this.activeRoute = this.router.url;
    this.syncSubmenusToRoute();
  }

  // ── Route Helpers ────────────────────────────────────────────
  isRouteActive(route: string): boolean {
    if (route === '/open-cashDesk') {
      return this.activeRoute.startsWith('/open-cashDesk') || this.activeRoute.startsWith('/daily-operation');
    }
    if (route === '/security') {
      return this.activeRoute.startsWith('/security');
    }
    if (route === '/stock') {
      return this.activeRoute.startsWith('/stock') && !this.activeRoute.startsWith('/stock-tontine');
    }
    if (route === '/stock-tontine') {
      return this.activeRoute.startsWith('/stock-tontine');
    }
    if (route === '/ventes') {
      return this.activeRoute.startsWith('/credit-list')
        || this.activeRoute.startsWith('/credits/late')
        || this.activeRoute.startsWith('/credits/echeance')
        || this.activeRoute.startsWith('/credits/recouvrements');
    }
    if (route === '/configuration') {
      return this.activeRoute.startsWith('/localitylist')
        || this.activeRoute.startsWith('/article-type')
        || this.activeRoute.startsWith('/expense/types')
        || this.activeRoute.startsWith('/parameters');
    }
    if (route === '/tontine') {
      return this.activeRoute.startsWith('/tontine');
    }
    return (
      this.activeRoute === route ||
      this.activeRoute === route + '/' ||
      (this.activeRoute.startsWith(route + '/') && !this.hasConflictingRoute(route))
    );
  }

  isSubRouteActive(route: string): boolean {
    return this.activeRoute === route || this.activeRoute.startsWith(route + '/');
  }

  private hasConflictingRoute(route: string): boolean {
    const allRoutes = [
      '/home', '/accounting-day', '/open-cashDesk', '/daily-operation',
      '/list', '/localitylist', '/credit-list', '/out-list', '/tontine-list',
      '/accountlist', '/client-list', '/report', '/inventory', '/gestion-list',
      '/operation-list', '/deposit-list', '/user-list', '/commercial-list',
      '/article-type', '/expense/types', '/parameters', '/stock', '/stock-tontine'
    ];
    return allRoutes.some(r => r !== route && r.startsWith(route) && r !== route + '/');
  }

  // ── Sync submenus open state based on current route ─────────
  private syncSubmenusToRoute(): void {
    const r = this.activeRoute;

    this.isCaisseOpen = r.startsWith('/open-cashDesk') || r.startsWith('/daily-operation');
    this.isSecurityOpen = r.startsWith('/security');
    this.isStockOpen = r.startsWith('/stock') && !r.startsWith('/stock-tontine');
    this.isStockTontineOpen = r.startsWith('/stock-tontine');

    this.isVentesOpen = r.startsWith('/credit-list')
      || r.startsWith('/credits/late')
      || r.startsWith('/credits/echeance')
      || r.startsWith('/credits/recouvrements');

    this.isTontineOpen = r.startsWith('/tontine');

    this.isConfigurationOpen = r.startsWith('/localitylist')
      || r.startsWith('/article-type')
      || r.startsWith('/expense/types')
      || r.startsWith('/parameters');
  }

  // ── Submenu Click Handlers ───────────────────────────────────
  onCaisseClick(): void {
    if (this.activeRoute.startsWith('/open-cashDesk') || this.activeRoute.startsWith('/daily-operation')) {
      this.isCaisseOpen = !this.isCaisseOpen;
    } else {
      this.router.navigate(['/open-cashDesk']);
      this.isCaisseOpen = true;
    }
  }

  onSecurityClick(): void {
    if (this.activeRoute.startsWith('/security')) {
      this.isSecurityOpen = !this.isSecurityOpen;
    } else {
      this.router.navigate(['/security/profils']);
      this.isSecurityOpen = true;
    }
  }

  onStockClick(): void {
    if (this.activeRoute.startsWith('/stock') && !this.activeRoute.startsWith('/stock-tontine')) {
      this.isStockOpen = !this.isStockOpen;
    } else {
      this.router.navigate(['/stock/request']);
      this.isStockOpen = true;
    }
  }

  onStockTontineClick(): void {
    if (this.activeRoute.startsWith('/stock-tontine')) {
      this.isStockTontineOpen = !this.isStockTontineOpen;
    } else {
      this.router.navigate(['/stock-tontine/request']);
      this.isStockTontineOpen = true;
    }
  }

  onVentesClick(): void {
    const active = this.activeRoute.startsWith('/credit-list')
      || this.activeRoute.startsWith('/credits/');
    if (active) {
      this.isVentesOpen = !this.isVentesOpen;
    } else {
      this.router.navigate(['/credit-list']);
      this.isVentesOpen = true;
    }
  }

  onTontineClick(): void {
    if (this.activeRoute.startsWith('/tontine')) {
      this.isTontineOpen = !this.isTontineOpen;
    } else {
      this.router.navigate(['/tontine']);
      this.isTontineOpen = true;
    }
  }

  onConfigurationClick(): void {
    const active = this.activeRoute.startsWith('/localitylist')
      || this.activeRoute.startsWith('/article-type')
      || this.activeRoute.startsWith('/expense/types')
      || this.activeRoute.startsWith('/parameters');
    if (active) {
      this.isConfigurationOpen = !this.isConfigurationOpen;
    } else {
      this.isConfigurationOpen = true;
    }
  }

  // ── Role / Access helpers ────────────────────────────────────
  hasAccessToParameters(): boolean {
    return this.userService.hasProfile('GESTIONNAIRE')
      || this.userService.hasProfile('MANAGER')
      || this.userService.hasProfile('SUPER_ADMIN');
  }

  hasCaisseAccess(): boolean {
    return this.userService.hasProfile(UserProfile.PROMOTER);
  }

  isStorekeeper(): boolean {
    return this.userService.hasProfile(UserProfile.STOREKEEPER);
  }

  isRecoveryManager(): boolean {
    return this.userService.hasProfile(UserProfile.RECOVERY_MANAGER);
  }

  isPromoter(): boolean {
    return this.userService.hasProfile(UserProfile.PROMOTER);
  }

  getUserGuideLink(): string {
    if (this.userService.hasProfile(UserProfile.SECRETARY) || this.userService.hasProfile(UserProfile.GESTIONNAIRE)) {
      return '/user-guide/manager/index.html';
    }
    if (this.userService.hasProfile(UserProfile.PROMOTER)) {
      return '/user-guide/commercial/index.html';
    }
    if (this.userService.hasProfile(UserProfile.STOREKEEPER)) {
      return '/user-guide/storekeeper/index.html';
    }
    return '/user-guide/index.html';
  }

  /** Resolve a human-readable role label from the roles array */
  private resolveRoleLabel(roles: string[]): string {
    const map: Record<string, string> = {
      ROLE_ADMIN:      'Administrateur',
      ROLE_MANAGER:    'Manager',
      ROLE_GESTIONNAIRE: 'Gestionnaire',
      ROLE_PROMOTER:   'Commercial',
      ROLE_STOREKEEPER: 'Magasinier',
      ROLE_REPORT:     'Rapports',
      ROLE_EDIT_USER:  'Admin Utilisateurs',
    };
    for (const r of roles) {
      if (map[r]) return map[r];
    }
    return roles[0] ?? 'Utilisateur';
  }

  // ── Logout ───────────────────────────────────────────────────
  confirmLogout(): void {
    Swal.fire({
      title: 'Êtes-vous sûr ?',
      html: 'Vous êtes sur le point de vous déconnecter.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, déconnectez-moi !',
      cancelButtonText: 'Annuler',
      buttonsStyling: false,
      customClass: {
        popup:         'custom-swal-popup',
        title:         'custom-swal-title',
        htmlContainer: 'custom-swal-html-container',
        confirmButton: 'custom-swal-confirm-button btn btn-primary',
        cancelButton:  'custom-swal-cancel-button btn btn-outline'
      },
      reverseButtons: true,
      focusCancel: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.logout();
      }
    });
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.tokenStorageService.signOut();
    this.router.navigate(['/login']);
  }

  closeSidebar(): void {
    this.layoutService.closeSidebar();
  }
}
