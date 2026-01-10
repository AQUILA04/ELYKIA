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

@Component({
  selector: 'app-stock-return-list',
  templateUrl: './stock-return-list.component.html',
  styleUrls: ['./stock-return-list.component.scss']
})
export class StockReturnListComponent implements OnInit {

  returns: StockReturn[] = [];
  page: number = 0;
  size: number = 20;
  totalPages: number = 0;
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

  handlePage(page: Page<StockReturn>) {
    this.returns = page.content;
    this.totalPages = page.totalPages;
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

  showDetails(stockReturn: StockReturn) {
    this.selectedReturn = stockReturn;
  }

  closeDetails() {
    this.selectedReturn = null;
  }

  getStatusBadge(status: string): string {
    return status === 'RECEIVED' ? 'badge-success' : 'badge-secondary';
  }

  getStatusLabel(status: string | undefined): string {
    return status === 'RECEIVED' ? 'Réceptionné' : 'En attente';
  }
}
