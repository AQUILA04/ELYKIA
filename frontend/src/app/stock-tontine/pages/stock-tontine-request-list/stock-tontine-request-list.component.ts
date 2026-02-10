import { Component, OnInit } from '@angular/core';
import { ExportFilter } from 'src/app/shared/components/stock-export-filter/stock-export-filter.component';
import { User } from 'src/app/user/service/user.service';
import { StockTontineRequestService } from '../../services/stock-tontine-request.service';
import { StockTontineRequest, StockRequestStatus } from '../../models/stock-tontine-request.model';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { ToastrService } from 'ngx-toastr';
import { AlertService } from 'src/app/shared/service/alert.service';
import { Page } from '../../../shared/models/page.model';

@Component({
  selector: 'app-stock-tontine-request-list',
  templateUrl: './stock-tontine-request-list.component.html',
  styleUrls: ['./stock-tontine-request-list.component.scss']
})
export class StockTontineRequestListComponent implements OnInit {

  requests: StockTontineRequest[] = [];
  page: number = 0;
  size: number = 20;
  totalPages: number = 0;

  isManager = false;
  isStoreKeeper = false;
  isPromoter = false;
  isSecretary = false;
  promoters: User[] = [];
  currentUser: any;
  selectedRequest: StockTontineRequest | null = null;

  constructor(
    private requestService: StockTontineRequestService,
    private spinner: NgxSpinnerService,
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService,
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
        this.promoters = page.data.content;
      },
      error: (err) => console.error('Error loading promoters', err)
    });
  }

  onExportPdf(filter: ExportFilter) {
    this.spinner.show();
    this.requestService.exportPdf(filter.startDate, filter.endDate, filter.collector)
      .subscribe({
        next: (data) => {
          const blob = new Blob([data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `rapport_stock_tontine_${filter.startDate}_${filter.endDate}.pdf`;
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

  loadRequests(): void {
    this.spinner.show();
    this.requestService.getAll(null, this.page, this.size).subscribe({
      next: (page: Page<StockTontineRequest>) => {
        this.requests = page.content;
        this.totalPages = page.totalPages;
        this.spinner.hide();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Erreur lors du chargement des demandes');
        this.spinner.hide();
      }
    });
  }

  createNew(): void {
    this.router.navigate(['/stock-tontine/request/create']);
  }

  validate(request: StockTontineRequest) {
    this.alertService.showConfirmation('Confirmation', 'Valider cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.spinner.show();
        this.requestService.validate(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande validée');
            this.loadRequests();
            this.spinner.hide();
          },
          error: (err) => {
            console.error('Error', err);
            this.alertService.showError(err.error?.message ?? 'Une Erreur s\'est produite lors de validation de la demande', 'Erreur de validation');
            this.spinner.hide();
          }
        });
      }
    });
  }

  deliver(request: StockTontineRequest) {
    this.alertService.showConfirmation('Confirmation', 'Confirmer la livraison de cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.spinner.show();
        this.requestService.deliver(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande livrée');
            this.loadRequests();
            this.spinner.hide();
          },
          error: (err) => {
            console.error('Error', err);
            this.alertService.showError(err.error?.message ?? 'Erreur de livraison', 'Erreur de livraison');
            this.spinner.hide();
          }
        });
      }
    });
  }

  showDetails(request: StockTontineRequest) {
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

  onPageChange(event: any) {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.loadRequests();
  }
}
