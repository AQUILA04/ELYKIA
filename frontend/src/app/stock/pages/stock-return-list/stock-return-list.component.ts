import { Component, OnInit } from '@angular/core';
import { StockReturnService } from '../../services/stock-return.service';
import { StockReturn, StockReturnStatus } from '../../models/stock-return.model';
import { Page } from '../../../shared/models/page.model';
import { AuthService } from '../../../auth/service/auth.service';
import { UserProfilConstant } from '../../../shared/constants/user-profil.constant';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';

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

  constructor(
    private stockReturnService: StockReturnService,
    private authService: AuthService,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isPromoter = this.authService.hasRole(UserProfilConstant.PROMOTER);
    this.isStoreKeeper = this.authService.hasRole(UserProfilConstant.STOREKEEPER) || this.authService.hasRole(UserProfilConstant.ADMIN);
    this.loadReturns();
  }

  loadReturns() {
    this.spinner.show();
    if (this.isPromoter) {
      this.stockReturnService.getByCollector(this.currentUser.username, this.page, this.size)
        .subscribe({
          next: page => {
            this.handlePage(page);
            this.spinner.hide();
          },
          error: () => this.spinner.hide()
        });
    } else {
      this.stockReturnService.getByCollector('', this.page, this.size)
        .subscribe({
          next: page => {
            this.handlePage(page);
            this.spinner.hide();
          },
          error: () => this.spinner.hide()
        });
    }
  }

  handlePage(page: Page<StockReturn>) {
    this.returns = page.content;
    this.totalPages = page.totalPages;
  }

  validate(stockReturn: StockReturn) {
    if (confirm('Confirmer la réception de ce retour ?')) {
      this.stockReturnService.validate(stockReturn.id!).subscribe({
        next: () => {
          this.toastr.success('Retour validé et stock mis à jour');
          this.loadReturns();
        },
        error: (err) => this.toastr.error(err.error?.message || 'Erreur lors de la validation')
      });
    }
  }

  getStatusBadge(status: string): string {
    return status === 'RECEIVED' ? 'badge-success' : 'badge-warning';
  }
}
