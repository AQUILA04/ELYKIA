import { Component, OnInit, HostBinding } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import Swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';

interface MobileSsoPayload {
  accessToken: string;
  refreshToken?: string;
  id: string | number;
  username: string;
  email?: string;
  roles: string[];
  profil?: string;
  mustChangePassword?: boolean;
  agencyId?: number | string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  isDarkMode = true;
  returnUrl: string = '/home';

  @HostBinding('class.light-mode') get lightMode() {
    return !this.isDarkMode;
  }

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private route: ActivatedRoute,
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';

    if (this.tryConsumeMobileSso()) {
      return;
    }

    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
      return;
    }

    // Détection du mode système (optionnel)
    if (window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      this.isDarkMode = prefersDark.matches;

      // Écouter les changements de préférence système
      prefersDark.addEventListener('change', (e) => {
        this.isDarkMode = e.matches;
      });
    }
  }

  /**
   * Consumes `#sso=<base64url>` payload produced by the mobile app for RECOVERY_MANAGER.
   */
  private tryConsumeMobileSso(): boolean {
    const hash = window.location.hash || '';
    const match = hash.match(/(?:^|#|&)sso=([^&]+)/);
    if (!match?.[1]) {
      return false;
    }

    try {
      const payload = this.decodeSsoPayload(match[1]);
      if (!payload?.accessToken || !payload?.username || !Array.isArray(payload.roles)) {
        throw new Error('Payload SSO incomplet');
      }

      const user = {
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        id: payload.id,
        username: payload.username,
        email: payload.email,
        roles: payload.roles,
        profil: payload.profil,
        mustChangePassword: payload.mustChangePassword === true,
        agencyId: payload.agencyId,
      };

      this.tokenStorage.saveToken(user.accessToken);
      this.tokenStorage.saveUser(user);
      if (user.agencyId != null && user.agencyId !== '') {
        this.tokenStorage.saveAgencyId(String(user.agencyId));
      }
      this.authService.hydrateSession(user);

      // Clear hash so a refresh does not re-apply SSO.
      history.replaceState(null, '', window.location.pathname + window.location.search);

      if (user.mustChangePassword) {
        this.router.navigate(['/user/change-password'], { queryParams: { forced: 'true' } });
      } else {
        this.router.navigateByUrl(this.returnUrl);
      }
      return true;
    } catch {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      this.errorMessage = 'Connexion automatique depuis mobile impossible. Veuillez vous connecter manuellement.';
      return false;
    }
  }

  private decodeSsoPayload(encoded: string): MobileSsoPayload {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    return JSON.parse(json) as MobileSsoPayload;
  }

  // Méthode optionnelle pour changer le thème basé sur l'heure
  checkTimeForTheme(): void {
    const hour = new Date().getHours();
    this.isDarkMode = hour < 6 || hour >= 18;
  }

  // Méthode pour basculer le thème manuellement (à appeler depuis un bouton si nécessaire)
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;

      const { username, password } = this.loginForm.value;

      this.authService.login(username, password).subscribe({
        next: (response) => {
          // Vérifier si c'est une erreur de licence
          if ('statusCode' in response && response.statusCode === 509) {
            this.isLoading = false;
            this.router.navigate(['/license']);
            return;
          }

          // Sauvegarder les données de l'utilisateur
          const token = response.accessToken;
          this.tokenStorage.saveToken(token);
          this.tokenStorage.saveUser(response);

          if (response.agencyId) {
            this.tokenStorage.saveAgencyId(response.agencyId.toString());
          }

          // Configurer les permissions
          this.authService.setPermissions(response.roles);

          this.isLoading = false;

          if (response.mustChangePassword) {
            this.router.navigate(['/user/change-password'], { queryParams: { forced: 'true' } });
            return;
          }

          // Rediriger vers l'URL de retour ou home
          this.router.navigateByUrl(this.returnUrl);
        },
        error: (error) => {
          this.isLoading = false;

          // Gérer l'erreur de licence
          if (error?.statusCode === 509) {
            Swal.fire({
              title: 'Licence Expirée',
              text: 'Votre licence a expiré. Veuillez la réactiver pour continuer.',
              icon: 'info',
              confirmButtonText: 'Réactiver la Licence'
            }).then((result) => {
              if (result.isConfirmed) {
                this.router.navigate(['/license']);
              }
            });
          } else {
            // Autres erreurs de connexion
            this.errorMessage = error?.error?.message ||
              'Erreur de connexion. Veuillez vérifier vos identifiants.';
          }
        }
      });
    }
  }
}
