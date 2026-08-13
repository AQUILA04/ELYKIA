import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientService, Client, BusinessCreditAuthorizationEvent } from '../service/client.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CreditService } from 'src/app/credit/service/credit.service';
import { PageEvent } from '@angular/material/paginator';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { AlertService } from 'src/app/shared/service/alert.service';

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
  safeProfilPhotoUrl: SafeUrl | null = null;
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

  dualCreditEnabled = false;
  isGestionnaire = false;
  authorizationHistory: BusinessCreditAuthorizationEvent[] = [];
  authorizationLoading = false;

  constructor(
    private route: ActivatedRoute,
    private clientService: ClientService,
    private creditService: CreditService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private sanitizer: DomSanitizer,
    private featureFlagService: FeatureFlagService,
    private userService: UserService,
    private alertService: AlertService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.dualCreditEnabled = this.featureFlagService.isFeatureEnabled(FeatureFlags.DualCreditAuthorization);
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
          if (this.dualCreditEnabled && this.isGestionnaire) {
            this.loadAuthorizationHistory(this.clientId);
          }
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
   * Prefer MinIO public URL (original then thumb); fallback to legacy PhotoStore stream.
   */
  resolveProfilPhoto(client: Client): void {
    const minioUrl = client.profilPhotoUrl || client.profilPhotoThumbUrl;
    if (minioUrl && (minioUrl.startsWith('http://') || minioUrl.startsWith('https://'))) {
      this.safeProfilPhotoUrl = this.sanitizer.bypassSecurityTrustUrl(minioUrl);
      return;
    }

    this.clientService.getProfilPhotoStream(client.id).subscribe(
      (image: Blob) => {
        if (image && image.size > 0) {
          const objectURL = URL.createObjectURL(image);
          this.safeProfilPhotoUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
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

  loadAuthorizationHistory(clientId: number): void {
    this.clientService.getBusinessCreditAuthorizationHistory(clientId).subscribe({
      next: (history) => {
        this.authorizationHistory = history;
      },
      error: (err) => console.error('Erreur chargement historique habilitation business', err)
    });
  }

  authorizeBusinessCredit(): void {
    if (!this.client) {
      return;
    }
    this.authorizationLoading = true;
    this.clientService.authorizeBusinessCredit(this.client.id).subscribe({
      next: (response) => {
        this.client = response.data;
        this.loadAuthorizationHistory(this.client.id);
        this.alertService.toastSuccess('Client habilité au crédit business');
        this.authorizationLoading = false;
      },
      error: (err) => {
        this.alertService.showError(err.error?.message || 'Impossible d\'habiliter le client');
        this.authorizationLoading = false;
      }
    });
  }

  revokeBusinessCredit(): void {
    if (!this.client) {
      return;
    }
    this.authorizationLoading = true;
    this.clientService.revokeBusinessCreditAuthorization(this.client.id).subscribe({
      next: (response) => {
        this.client = response.data;
        this.loadAuthorizationHistory(this.client.id);
        this.alertService.toastSuccess('Habilitation crédit business retirée');
        this.authorizationLoading = false;
      },
      error: (err) => {
        this.alertService.showError(err.error?.message || 'Impossible de retirer l\'habilitation');
        this.authorizationLoading = false;
      }
    });
  }
}

