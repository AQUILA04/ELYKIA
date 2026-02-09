import { Component, OnInit } from '@angular/core';
import { ExportFilter } from 'src/app/shared/components/stock-export-filter/stock-export-filter.component';
import { User } from 'src/app/user/service/user.service';
import { StockRequestService } from '../../services/stock-request.service';
import { StockRequest, StockRequestStatus } from '../../models/stock-request.model';
import { Page } from '../../../shared/models/page.model';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-stock-request-list',
  templateUrl: './stock-request-list.component.html',
  styleUrls: ['./stock-request-list.component.scss']
})
export class StockRequestListComponent implements OnInit {

  requests: any[] = []; // Changed type from StockRequest[] to any[]
  page: number = 0;
  size: number = 20;
  totalPages: number = 0;
  isManager = false; // Changed declaration
  isStoreKeeper = false; // Changed declaration
  isPromoter = false; // Changed declaration
  isSecretary = false;
  promoters: User[] = [];
  currentUser: any;
  selectedRequest: StockRequest | null = null; // Pour la modale de détails

  constructor(
    private stockRequestService: StockRequestService,
    private authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService, // Added NgxSpinnerService
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE) || this.userService.hasProfile(UserProfile.ADMIN) || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
    this.isStoreKeeper = this.userService.hasProfile(UserProfile.STOREKEEPER);
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isSecretary = this.userService.hasProfile(UserProfile.SECRETARY);

    if (this.canSelectPromoter) {
      this.loadPromoters();
    }
    this.loadRequests();
  }

  get canSelectPromoter(): boolean {
    return this.isManager || this.isSecretary;
  }

  loadPromoters() {
    this.userService.getPromoters(0, 1000).subscribe({
      next: (page) => {
        this.promoters = page.content;
      },
      error: (err) => console.error('Error loading promoters', err)
    });
  }

  onExportPdf(filter: ExportFilter) {
    this.spinner.show();
    this.stockRequestService.exportPdf(filter.startDate, filter.endDate, filter.collector)
      .subscribe({
        next: (data) => {
          const blob = new Blob([data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `rapport_stock_${filter.startDate}_${filter.endDate}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.spinner.hide();
          this.toastr.success('Export PDF téléchargé avec succès');
        },
        error: (err) => {
          console.error('Export error', err);
          this.toastr.error('Erreur lors du téléchargement du PDF');
          this.spinner.hide();
        }
      });
  }

  loadRequests() {
    this.spinner.show(); // Added spinner
    this.stockRequestService.getAll(null, this.page, this.size)
      .subscribe({
        next: (page) => {
          this.handlePage(page);
          this.spinner.hide();
        },
        error: (err) => {
          this.toastr.error('Erreur lors du chargement des demandes', 'Erreur');
          this.spinner.hide();
        }
      });
  }

  handlePage(page: Page<StockRequest>) {
    this.requests = page.content;
    this.totalPages = page.totalPages;
  }

  validate(request: StockRequest) {
    this.alertService.showConfirmation('Confirmation', 'Valider cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.stockRequestService.validate(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande validée');
            this.loadRequests();
          },
          error: (err) => {
            console.error('Error', err);
            this.alertService.showError(err.error?.message ?? 'Une Erreur s\'est produite lors de validation de la demande', 'Erreur de validation de livraison');
          }
        });
      }
    });
  }

  deliver(request: StockRequest) {
    this.alertService.showConfirmation('Confirmation', 'Confirmer la livraison de cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.stockRequestService.deliver(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande livrée');
            this.loadRequests();
          },
          error: (err) => {
            console.error('Error', err);
            this.alertService.showError(err.error?.message ?? 'Erreur de livraison', 'Erreur de livraison');
          }
        });
      }
    });
  }

  showDetails(request: StockRequest) {
    this.selectedRequest = request;
  }

  closeDetails() {
    this.selectedRequest = null;
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'CREATED': return 'badge-secondary';
      case 'VALIDATED': return 'badge-success';
      case 'DELIVERED': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-danger';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'CREATED': return 'Créé';
      case 'VALIDATED': return 'Validé';
      case 'DELIVERED': return 'Livré';
      case 'CANCELLED': return 'Annulé';
      default: return 'badge-danger';
    }
  }
}
