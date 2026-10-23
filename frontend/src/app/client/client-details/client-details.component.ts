import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientService, Client, AdhesionSubmission, ClientAdhesion } from '../service/client.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CreditService } from 'src/app/credit/service/credit.service';
import { PageEvent } from '@angular/material/paginator';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { AlertService } from 'src/app/shared/service/alert.service';
import { ClientPhotoUrlService } from 'src/app/shared/service/client-photo-url.service';

@Component({
  selector: 'app-client-details',
  templateUrl: './client-details.component.html',
  styleUrls: ['./client-details.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ClientDetailsComponent implements OnInit {
  client: Client | undefined;
  clientDetails: any = {};
  isLoading = true;
  /** Plain https string or trusted blob: SafeUrl for legacy PhotoStore streams. */
  safeProfilPhotoUrl: string | SafeUrl | null = null;
  clientId: number = 0;

  // Credits (Achats)
  credits: any[] = [];
  currentCreditPage = 0;
  creditPageSize = 5;
  totalCreditElements = 0;

  // Cotisations (Timeline)
  cotisations: any[] = [];
  currentCotisationPage = 0;
  cotisationPageSize = 10;
  totalCotisationElements = 0;

  isGestionnaire = false;
  adhesions: ClientAdhesion[] = [];
  adhesionSubmissions: AdhesionSubmission[] = [];
  adhesionLoading = false;
  topUpAmounts: Record<string, number> = {};

  constructor(
    private route: ActivatedRoute,
    private clientService: ClientService,
    private creditService: CreditService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private sanitizer: DomSanitizer,
    private userService: UserService,
    private alertService: AlertService,
    private clientPhotoUrlService: ClientPhotoUrlService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.isGestionnaire = this.userService.hasProfile(UserProfile.GESTIONNAIRE);
    this.route.params.subscribe(params => {
      this.clientId = +params['id'];
      this.loadAllData();
    });
  }

  loadAllData(): void {
    this.isLoading = true;
    this.safeProfilPhotoUrl = null;
    this.loadClient(this.clientId);
    this.loadClientDetails(this.clientId);
    this.loadCredits(this.clientId);
    this.loadCotisations(this.clientId);
  }

  loadClient(clientId: number): void {
    this.clientService.getClientById(clientId).subscribe(
      (response: any) => {
        if (response && response.data) {
          this.client = response.data;
          this.resolveProfilPhoto(response.data);
          this.loadAdhesions(this.clientId);
        }
        this.checkLoadingComplete();
      },
      error => {
        console.error('Erreur chargement client', error);
        this.checkLoadingComplete();
      }
    );
  }

  /**
   * Prefer short-lived MinIO URL from the backend; fall back to legacy PhotoStore stream.
   * Never bind raw MinIO public URLs from the DTO (bucket is private).
   */
  resolveProfilPhoto(client: Client): void {
    const hasMinioMarker = !!(client.profilPhotoUrl || client.profilPhotoThumbUrl);
    if (hasMinioMarker) {
      this.clientPhotoUrlService.getUrl(client.id, 'PROFIL', 'THUMB').subscribe({
        next: (entry) => {
          if (entry?.url) {
            // https / signed MinIO — Angular allows plain https in img[src]
            this.safeProfilPhotoUrl = entry.url;
            return;
          }
          if (entry?.legacy) {
            // Transitional: photo still only in PhotoStore
            this.loadLegacyProfilPhotoStream(client.id);
            return;
          }
          // Thumb missing but original may exist — try ORIGINAL once
          this.clientPhotoUrlService.getUrl(client.id, 'PROFIL', 'ORIGINAL').subscribe({
            next: (orig) => {
              if (orig?.url) {
                this.safeProfilPhotoUrl = orig.url;
              } else {
                this.safeProfilPhotoUrl = null;
              }
            },
            error: () => { this.safeProfilPhotoUrl = null; }
          });
        },
        error: () => {
          this.safeProfilPhotoUrl = null;
        }
      });
      return;
    }

    this.loadLegacyProfilPhotoStream(client.id);
  }

  /** @deprecated Transitional PhotoStore path — remove when migration is complete. */
  private loadLegacyProfilPhotoStream(clientId: number): void {
    this.clientService.getProfilPhotoStream(clientId).subscribe(
      (image: Blob) => {
        if (image && image.size > 0) {
          const objectURL = URL.createObjectURL(image);
          // blob: from authenticated API stream — requires trust for img[src]
          this.safeProfilPhotoUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL); // NOSONAR
        } else {
          this.safeProfilPhotoUrl = null;
        }
      },
      error => {
        console.error('Erreur chargement photo de profil', error);
        this.safeProfilPhotoUrl = null;
      }
    );
  }

  loadClientDetails(clientId: number): void {
    this.creditService.getClientDetails(clientId).subscribe(
      (response: any) => {
        if (response.statusCode === 200) {
          this.clientDetails = response.data;
        }
        this.checkLoadingComplete();
      },
      error => {
        console.error('Erreur chargement détails client', error);
        this.checkLoadingComplete();
      }
    );
  }

  loadCredits(clientId: number): void {
    // Use searchCredits instead of getCreditsByClient to fetch all history
    const searchDto = {
      clientId: clientId
    };

    this.creditService.searchCredits(searchDto, this.currentCreditPage, this.creditPageSize).subscribe(
      (response: any) => {
        if (response.statusCode === 200) {
          this.credits = response.data.content;
          // Sort credits by ID descending (newest first)
          this.credits.sort((a: any, b: any) => b.id - a.id);
          this.totalCreditElements = response.data.page.totalElements;
        }
        this.checkLoadingComplete();
      },
      error => {
        console.error('Erreur chargement crédits', error);
        this.checkLoadingComplete();
      }
    );
  }

  loadCotisations(clientId: number): void {
    this.creditService.getCreditHistoryByClient(clientId, this.currentCotisationPage, this.cotisationPageSize, 'id,desc').subscribe(
      data => {
        if (data.statusCode === 200) {
          this.cotisations = data.data.content;
          // Sort cotisations by ID descending (newest first)
          this.cotisations.sort((a: any, b: any) => b.id - a.id);
          this.totalCotisationElements = data.data.page.totalElements;
        }
        this.checkLoadingComplete();
      },
      error => {
        console.error('Erreur chargement cotisations', error);
        this.checkLoadingComplete();
      }
    );
  }

  checkLoadingComplete(): void {
    this.isLoading = false;
  }

  onCancel(): void {
    this.router.navigate(['/client/list']);
  }

  navigateToEdit(clientId: number): void {
    this.router.navigate(['/client/add', clientId]);
  }

  onCreditPageChange(event: PageEvent): void {
    this.currentCreditPage = event.pageIndex;
    this.creditPageSize = event.pageSize;
    this.loadCredits(this.clientId);
  }

  onCotisationPageChange(event: PageEvent): void {
    this.currentCotisationPage = event.pageIndex;
    this.cotisationPageSize = event.pageSize;
    this.loadCotisations(this.clientId);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'badge-success';
      case 'PENDING': return 'badge-warning';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  loadAdhesions(clientId: number): void {
    this.clientService.getAdhesions(clientId).subscribe({
      next: (adhesions) => { this.adhesions = adhesions; },
      error: (err) => console.error('Erreur chargement des adhésions', err)
    });
    if (this.isGestionnaire) {
      this.clientService.getAdhesionSubmissions(clientId).subscribe({
        next: (rows) => { this.adhesionSubmissions = rows; },
        error: (err) => console.error('Erreur chargement des déclarations d\'adhésion', err)
      });
    }
  }

  adhesionLabel(type: string): string {
    switch (type) {
      case 'BUSINESS': return 'Business';
      case 'EVENT': return 'Événement';
      default: return 'Personnel';
    }
  }

  hasActive(type: ClientAdhesion['adhesionType']): boolean {
    return this.adhesions.some(item => item.adhesionType === type && item.status === 'ACTIVE');
  }

  pendingSubmissions(): AdhesionSubmission[] {
    return this.adhesionSubmissions.filter(item => item.status === 'INITIE');
  }

  subscribeAdhesion(type: ClientAdhesion['adhesionType']): void {
    if (!this.client) {
      return;
    }
    const fee = type === 'PERSONAL' ? '500' : '2 000';
    void this.alertService.showConfirmation(
      'Souscrire une adhésion',
      `Encaisser ${fee} FCFA pour l'adhésion ${this.adhesionLabel(type)} ?`,
      'Encaisser',
      'Annuler'
    ).then((confirmed) => {
      if (!confirmed || !this.client) {
        return;
      }
      this.adhesionLoading = true;
      this.clientService.subscribeAdhesion(this.client.id, type).subscribe({
        next: (adhesions) => {
          this.adhesions = adhesions;
          this.adhesionLoading = false;
          this.alertService.toastSuccess('Adhésion enregistrée');
          this.loadClient(this.clientId);
        },
        error: (err) => {
          this.adhesionLoading = false;
          this.alertService.showError(err.error?.message || 'Impossible d\'enregistrer l\'adhésion');
        }
      });
    });
  }

  topUpAdhesion(type: ClientAdhesion['adhesionType']): void {
    if (!this.client) {
      return;
    }
    const amount = Number(this.topUpAmounts[type]);
    if (!amount || amount <= 0) {
      this.alertService.showWarning('Indiquez un montant à ajouter au solde.');
      return;
    }
    this.adhesionLoading = true;
    this.clientService.topUpAdhesion(this.client.id, type, amount).subscribe({
      next: (adhesions) => {
        this.adhesions = adhesions;
        this.topUpAmounts[type] = 0;
        this.adhesionLoading = false;
        this.alertService.toastSuccess('Solde mis à jour');
      },
      error: (err) => {
        this.adhesionLoading = false;
        this.alertService.showError(err.error?.message || 'Impossible d\'ajouter au solde');
      }
    });
  }

  validateSubmission(submission: AdhesionSubmission): void {
    this.adhesionLoading = true;
    this.clientService.validateAdhesionSubmission(this.clientId, submission.id).subscribe({
      next: () => {
        this.adhesionLoading = false;
        this.alertService.toastSuccess('Déclaration validée');
        this.loadAdhesions(this.clientId);
        this.loadClient(this.clientId);
      },
      error: (err) => {
        this.adhesionLoading = false;
        this.alertService.showError(err.error?.message || 'Validation impossible');
      }
    });
  }

  rejectSubmission(submission: AdhesionSubmission): void {
    void this.alertService.showConfirmation(
      'Rejeter la déclaration',
      'La déclaration Mobile Money sera rejetée.',
      'Rejeter',
      'Annuler'
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.adhesionLoading = true;
      this.clientService.rejectAdhesionSubmission(this.clientId, submission.id, 'Rejetée par le gestionnaire').subscribe({
        next: () => {
          this.adhesionLoading = false;
          this.alertService.toastSuccess('Déclaration rejetée');
          this.loadAdhesions(this.clientId);
        },
        error: (err) => {
          this.adhesionLoading = false;
          this.alertService.showError(err.error?.message || 'Rejet impossible');
        }
      });
    });
  }
}

