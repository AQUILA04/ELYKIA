import { Component, OnInit } from '@angular/core';
import { StockReturnService } from '../../services/stock-return.service';
import { StockReturn, StockReturnStatus } from '../../models/stock-return.model';
import { Page } from '../../../shared/models/page.model';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';
import { AlertService } from 'src/app/shared/service/alert.service';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-stock-return-list',
  templateUrl: './stock-return-list.component.html',
  styleUrls: ['./stock-return-list.component.scss']
})
export class StockReturnListComponent implements OnInit {

  returns: StockReturn[] = [];
  page: number = 0;
  size: number = 10;
  totalElements: number = 0;
  isPromoter: boolean = false;
  isStoreKeeper: boolean = false;
  currentUser: any;
  selectedReturn: StockReturn | null = null;

  constructor(
    private stockReturnService: StockReturnService,
    private authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isStoreKeeper = this.userService.hasProfile(UserProfile.STOREKEEPER) || this.userService.hasProfile(UserProfile.ADMIN);
    this.loadReturns();
  }

  loadReturns() {
    this.spinner.show();
    this.stockReturnService.getAll(null, this.page, this.size)
      .subscribe({
        next: page => {
          this.handlePage(page);
          this.spinner.hide();
        },
        error: () => this.spinner.hide()
      });
  }

  handlePage(page: any) {
    this.returns = page.content;
    this.totalElements = page.page.totalElements;
  }

  onPageChange(event: PageEvent) {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.loadReturns();
  }

  validate(stockReturn: StockReturn) {
    this.alertService.showConfirmation('Confirmation', 'Confirmer la réception de ce retour ?').then((confirmed) => {
      if (confirmed) {
        this.stockReturnService.validate(stockReturn.id!).subscribe({
          next: () => {
            this.toastr.success('Retour validé et stock mis à jour');
            this.loadReturns();
          },
          error: (err) => this.toastr.error(err.error?.message || 'Erreur lors de la validation')
        });
      }
    });
  }

  cancel(ret: StockReturn) {
    this.alertService.showConfirmation('Confirmation', 'Annuler ce retour ?').then((confirmed) => {
      if (confirmed) {
        this.stockReturnService.cancel(ret.id!).subscribe({
          next: () => {
            this.toastr.success('Retour annulé');
            this.loadReturns();
          },
          error: (err) => {
            console.error('Error', err);
            this.alertService.showError(err.error?.message ?? 'Une Erreur s\'est produite lors de l\'annulation du retour', 'Erreur d\'annulation');
          }
        });
      }
    });
  }

  refuse(ret: StockReturn) {
    this.alertService.showConfirmation('Confirmation', 'Refuser ce retour ?').then((confirmed) => {
      if (confirmed) {
        this.stockReturnService.refuse(ret.id!).subscribe({
          next: () => {
            this.toastr.success('Retour refusé');
            this.loadReturns();
          },
          error: (err) => {
            console.error('Error', err);
            this.alertService.showError(err.error?.message ?? 'Une Erreur s\'est produite lors du refus du retour', 'Erreur de refus');
          }
        });
      }
    });
  }

  showDetails(stockReturn: StockReturn) {
    this.selectedReturn = stockReturn;
  }

  closeDetails() {
    this.selectedReturn = null;
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'RECEIVED': return 'badge-success';
      case 'CREATED': return 'badge-secondary';
      case 'CANCELLED': return 'badge-danger';
      case 'REFUSED': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'RECEIVED': return 'Réceptionné';
      case 'CREATED': return 'En attente';
      case 'CANCELLED': return 'Annulé';
      case 'REFUSED': return 'Refusé';
      default: return 'Inconnu';
    }
  }
}
