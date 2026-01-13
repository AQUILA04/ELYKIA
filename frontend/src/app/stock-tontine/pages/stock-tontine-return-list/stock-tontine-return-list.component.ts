import { Component, OnInit } from '@angular/core';
import { StockTontineReturnService } from '../../services/stock-tontine-return.service';
import { StockTontineReturn, StockReturnStatus } from '../../models/stock-tontine-return.model';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';
import { Page } from '../../../shared/models/page.model';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { ToastrService } from 'ngx-toastr';
import { AlertService } from 'src/app/shared/service/alert.service';

@Component({
  selector: 'app-stock-tontine-return-list',
  templateUrl: './stock-tontine-return-list.component.html',
  styleUrls: ['./stock-tontine-return-list.component.scss']
})
export class StockTontineReturnListComponent implements OnInit {

  returns: StockTontineReturn[] = [];
  page: number = 0;
  size: number = 20;
  totalPages: number = 0;

  isPromoter: boolean = false;
  isStoreKeeper: boolean = false;
  currentUser: any;
  selectedReturn: StockTontineReturn | null = null;

  displayedColumns: string[] = ['date', 'status', 'items', 'actions'];

  constructor(
    private returnService: StockTontineReturnService,
    private spinner: NgxSpinnerService,
    private router: Router,
    private authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isStoreKeeper = this.userService.hasProfile(UserProfile.STOREKEEPER) || this.userService.hasProfile(UserProfile.ADMIN);
    this.loadReturns();
  }

  loadReturns(): void {
    this.spinner.show();
    this.returnService.getAllReturns(null, this.page, this.size).subscribe({
      next: (page: Page<StockTontineReturn>) => {
        this.returns = page.content;
        this.totalPages = page.totalPages;
        this.spinner.hide();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Erreur lors du chargement des retours');
        this.spinner.hide();
      }
    });
  }

  createNew(): void {
    this.router.navigate(['/stock-tontine/return/create']);
  }

  validate(stockReturn: StockTontineReturn) {
    this.alertService.showConfirmation('Confirmation', 'Confirmer la réception de ce retour ?').then((confirmed) => {
      if (confirmed) {
        this.spinner.show();
        this.returnService.validate(stockReturn.id!).subscribe({
          next: () => {
            this.toastr.success('Retour validé et stock mis à jour');
            this.loadReturns();
            this.spinner.hide();
          },
          error: (err) => {
            this.toastr.error(err.error?.message || 'Erreur lors de la validation');
            this.spinner.hide();
          }
        });
      }
    });
  }

  showDetails(stockReturn: StockTontineReturn) {
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

  onPageChange(event: any) {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.loadReturns();
  }
}
