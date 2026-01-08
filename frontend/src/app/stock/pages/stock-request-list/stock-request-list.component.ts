import { Component, OnInit } from '@angular/core';
import { StockRequestService } from '../../services/stock-request.service';
import { StockRequest, StockRequestStatus } from '../../models/stock-request.model';
import { Page } from '../../../shared/models/page.model';
import { AuthService } from '../../../auth/service/auth.service';
import { UserProfilConstant } from '../../../shared/constants/user-profil.constant';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';

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
  currentUser: any;
  selectedRequest: StockRequest | null = null; // Pour la modale de détails

  constructor(
    private stockRequestService: StockRequestService,
    private authService: AuthService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService // Added NgxSpinnerService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isManager = this.authService.hasRole('ROLE_GESTIONNAIRE') || this.authService.hasRole('ROLE_REPORT'); // Changed role check
    this.isStoreKeeper = this.authService.hasRole('ROLE_STOREKEEPER'); // Changed role check
    this.isPromoter = this.authService.hasRole('ROLE_PROMOTER'); // Changed role check
    console.log('REQUEST LIST LOAD ...');
    this.loadRequests();
  }

  loadRequests() {
    console.log('REQUEST LIST LOAD 2 ...');
    this.spinner.show(); // Added spinner
    this.stockRequestService.getAll(null, this.page, this.size)
      .subscribe({
        next: (page) => {
          console.log('SUCCESS RESPONSE', page)
          this.handlePage(page);
          this.spinner.hide();
        },
        error: (err) => {
          console.log('ERROR RESPONSE ', err)
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
    if (confirm('Valider cette demande ?')) {
      this.stockRequestService.validate(request.id!).subscribe({
        next: () => {
          this.toastr.success('Demande validée');
          this.loadRequests();
        },
        error: () => this.toastr.error('Erreur lors de la validation')
      });
    }
  }

  deliver(request: StockRequest) {
    if (confirm('Confirmer la livraison de cette demande ?')) {
      this.stockRequestService.deliver(request.id!).subscribe({
        next: () => {
          this.toastr.success('Demande livrée');
          this.loadRequests();
        },
        error: (err) => this.toastr.error(err.error?.message || 'Erreur lors de la livraison')
      });
    }
  }

  showDetails(request: StockRequest) {
    this.selectedRequest = request;
  }

  closeDetails() {
    this.selectedRequest = null;
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'CREATED': return 'badge-warning';
      case 'VALIDATED': return 'badge-info';
      case 'DELIVERED': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }
}
