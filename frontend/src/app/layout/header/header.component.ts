import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import Swal from 'sweetalert2';
import { AuthService } from '../../auth/service/auth.service';
import { LayoutService } from 'src/app/shared/service/layout.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  username       = '';
  initials       = '';
  pageTitle      = 'Dashboard';
  hasNotifications = true;

  // Map route segments to human-readable titles
  private readonly routeTitles: Record<string, string> = {
    'home':             'Tableau de bord',
    'bi':               'Dashboard BI',
    'client-list':      'Clients',
    'accountlist':      'Comptes',
    'list':             'Articles',
    'stock':            'Stock Commercial',
    'stock-tontine':    'Stock Tontine',
    'credit-list':      'Ventes',
    'credits':          'Ventes',
    'tontine':          'Tontines',
    'orders':           'Commandes',
    'expense':          'Dépenses',
    'localitylist':     'Localités',
    'article-type':     'Types d\'Articles',
    'parameters':       'Paramètres',
    'daily-report':     'Rapport Journalier',
    'inventory':        'Inventaires',
    'gestion-list':     'Agences',
    'operation-list':   'Opérations',
    'deposit-list':     'Dépôts',
    'user-list':        'Utilisateurs',
    'security':         'Sécurité',
    'profil':           'Mon Profil',
    'health-journal':   'Journal',
    'license':          'Licence',
    'open-cashDesk':    'Caisse',
    'daily-operation':  'Opérations Journalières',
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private tokenStorage: TokenStorageService,
    private authService: AuthService,
    private alertService: AlertService,
    private layoutService: LayoutService
  ) {}

  ngOnInit(): void {
    // Set user info
    this.username = this.authService.getUsername() ?? '';
    this.initials = this.buildInitials(this.username);

    // Track route changes to update page title
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        const url = this.router.url;
        const segments = url.split('/').filter(Boolean);
        return segments[0] ?? 'home';
      })
    ).subscribe(segment => {
      this.pageTitle = this.routeTitles[segment] ?? 'Elykia';
    });

    // Set initial title
    const segment = this.router.url.split('/').filter(Boolean)[0] ?? 'home';
    this.pageTitle = this.routeTitles[segment] ?? 'Elykia';
  }

  // ── Sidebar toggle (mobile) ──────────────────────────────────
  toggleSidebar(): void {
    this.layoutService.toggleSidebar();
  }

  // ── Search ───────────────────────────────────────────────────
  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    // Implement global search logic here
    console.log('Search query:', query);
  }

  // ── Logout ───────────────────────────────────────────────────
  confirmLogout(): void {
    this.alertService
      .showConfirmation(
        'Confirmation de déconnexion',
        'Voulez-vous vraiment vous déconnecter ?',
        'Oui, déconnecter',
        'Annuler'
      )
      .then((result) => {
        if (result) {
          this.logout();
        }
      });
  }

  logout(): void {
    this.authService.logout();
    localStorage.setItem('logout-event', Date.now().toString());
  }

  // ── Helpers ──────────────────────────────────────────────────
  private buildInitials(name: string): string {
    if (!name) return 'EL';
    const parts = name.trim().split(/[\s._-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
