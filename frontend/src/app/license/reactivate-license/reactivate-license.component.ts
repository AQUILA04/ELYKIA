import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LicenseService } from '../service/license.service';
import Swal from 'sweetalert2';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-reactivate-license',
  templateUrl: './reactivate-license.component.html',
  styleUrls: ['./reactivate-license.component.scss']
})
export class ReactivateLicenseComponent {
  licenseKey: string = '';
  isLoading = true;
  readonly licenseKeyPattern = /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/;

  constructor(private licenseService: LicenseService, 
    private router: Router, 
    private tokenStorage : TokenStorageService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  isLicenseKeyValid(): boolean {
    return this.licenseKeyPattern.test(this.licenseKey.toUpperCase());
  }

  onLicenseKeyInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    // Le pipe s'occupera du formatage, ici on s'assure juste que la valeur est mise à jour
    // et potentiellement la forcer en majuscules si le pipe ne le fait pas déjà.
    this.licenseKey = inputElement.value.toUpperCase(); 
  }

  onSubmit(): void {
    if (!this.licenseKey.trim() || !this.isLicenseKeyValid()) {
      this.alertService.showError('Veuillez entrer une clé de licence valide !', 'Licence invalide !');
      return;
    }

    this.isLoading = true;
    this.licenseService.activateLicense(this.licenseKey).subscribe(
      response => {
        this.isLoading = false;
        
        if (response.success) {
          localStorage.setItem('licenseActive', 'true');
          this.router.navigate(['/login']);
        } else {
         this.alertService.showError('Activation de la licence échouée: '+ response.message+'!', 'Echec d\'activation de licence !');
        }
      },
      error => {
        this.isLoading = false;
        console.error('Error activating license', error);
        const errorMessage = error?.error?.message || 'Une erreur est survenue lors de l\'activation de la licence.';
        this.alertService.showError(errorMessage, 'Echec d\'activation de licence !');
        
      }
    );
  }
}