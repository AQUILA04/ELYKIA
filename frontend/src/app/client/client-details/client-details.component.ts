import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientService, Client } from '../service/client.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
// AJOUT : Imports pour la sécurité des URLs
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-client-details',
  templateUrl: './client-details.component.html',
  styleUrls: ['./client-details.component.scss']
})
export class ClientDetailsComponent implements OnInit {
  client: Client | undefined;
  isLoading = true;

  // AJOUT : Nouvelle variable pour stocker l'URL sécurisée de l'image
  safeProfilPhotoUrl: SafeUrl | null = null;

  constructor(
    private route: ActivatedRoute,
    private clientService: ClientService,
    private router: Router,
    private tokenStorage : TokenStorageService,
    private spinner : NgxSpinnerService,
    // AJOUT : Injection du service DomSanitizer
    private sanitizer: DomSanitizer
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const clientId = +params['id'];
      this.loadClient(clientId);
    });
  }
  onCancel(): void {
    this.router.navigate(['/client-list']);
  }
  navigateToEdit(clientId: number): void {
    this.router.navigate(['/client-add', clientId]);
  }

  loadClient(clientId: number): void {
    this.spinner.show();
    this.clientService.getClientById(clientId).subscribe(
      (response: any) => {
        if (response && response.data) {
          this.spinner.hide();
          this.client = response.data;

          // CORRECTION : On vérifie si une photo de profil existe, on ajoute le préfixe Data URL et on la sécurise
          if (this.client && this.client.profilPhoto) {
            const imageUrl = `data:image/jpeg;base64,${this.client.profilPhoto}`;
            // On marque l'URL comme sûre pour l'affichage
            this.safeProfilPhotoUrl = this.sanitizer.bypassSecurityTrustUrl(imageUrl);
          }

          this.isLoading = false;
        } else {
          console.error('Réponse inattendue de l\'API:', response);
          this.spinner.hide();
          this.isLoading = false;
        }
      },
      error => {
        this.spinner.hide();
        console.error('Erreur lors de la récupération des détails du client', error);
        this.isLoading = false;
      }
    );
  }
}

