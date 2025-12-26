import { Component, OnInit, HostBinding } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../service/auth.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxPermissionsService } from 'ngx-permissions';
import Swal from 'sweetalert2';
import { HttpErrorResponse } from '@angular/common/http';

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
    private permissionsService: NgxPermissionsService,
    private route: ActivatedRoute,
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
      return;
    }
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    // Détection du mode système (optionnel)
    if (window.matchMedia) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      this.isDarkMode = prefersDark.matches;

      // Écouter les changements de préférence système
      prefersDark.addEventListener('change', (e) => {
        this.isDarkMode = e.matches;
      });
    }

    // Vous pouvez aussi ajouter un bouton pour basculer manuellement
    // this.checkTimeForTheme();
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
          this.authService.setPermissions(response.roles || []);
          this.permissionsService.loadPermissions(response.roles || []);

          this.isLoading = false;

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