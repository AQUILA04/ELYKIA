import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ClientService, Client } from '../service/client.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { CreditService } from 'src/app/credit/service/credit.service';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-client-details',
  templateUrl: './client-details.component.html',
  styleUrls: ['./client-details.component.scss']
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

  constructor(
    private route: ActivatedRoute,
    private clientService: ClientService,
    private creditService: CreditService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private spinner: NgxSpinnerService,
    private sanitizer: DomSanitizer
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.clientId = +params['id'];
      this.loadAllData();
    });
  }

  loadAllData(): void {
    this.spinner.show();
    this.loadClient(this.clientId);
    this.loadClientDetails(this.clientId);
    this.loadCredits(this.clientId);
    this.loadCotisations(this.clientId);
    this.loadProfilPhoto(this.clientId);
  }

  loadClient(clientId: number): void {
    this.clientService.getClientById(clientId).subscribe(
      (response: any) => {
        if (response && response.data) {
          this.client = response.data;
        }
        this.checkLoadingComplete();
      },
      error => {
        console.error('Erreur chargement client', error);
        this.checkLoadingComplete();
      }
    );
  }

  loadProfilPhoto(clientId: number): void {
    this.clientService.getProfilPhotoStream(clientId).subscribe(
      (image: Blob) => {
        const objectURL = URL.createObjectURL(image);
        this.safeProfilPhotoUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
      },
      error => {
        console.error('Erreur chargement photo de profil', error);
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
          this.totalCreditElements = response.data.totalElements;
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
    // Simple check, can be improved with forkJoin
    this.isLoading = false;
    this.spinner.hide();
  }

  onCancel(): void {
    this.router.navigate(['/client-list']);
  }

  navigateToEdit(clientId: number): void {
    this.router.navigate(['/client-add', clientId]);
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
}
