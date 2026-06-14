import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { StockReturn } from '../../models/stock-return.model';
import { StockListFilter } from '../../services/stock-request.service';
import { StockReturnKpis, StockReturnService } from '../../services/stock-return.service';
import {
  buildPreviousMonthOptions,
  getStockPeriodLabel,
  MonthOption,
  resolveStockPeriodRange,
  StockPeriodKey
} from '../../utils/stock-period.util';

interface StockReturnListState {
  selectedPeriod: StockPeriodKey;
  selectedCommercial: string | null;
  page: number;
  size: number;
}

@Component({
  selector: 'app-stock-return-list',
  templateUrl: './stock-return-list.component.html',
  styleUrls: ['./stock-return-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockReturnListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'stockReturnListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  returns: StockReturn[] = [];
  page = 0;
  size = 10;
  totalElements = 0;
  isLoading = true;

  isPromoter = false;
  isStoreKeeper = false;
  canSelectCommercial = false;

  currentUser: any;
  selectedReturn: StockReturn | null = null;

  selectedPeriod: StockPeriodKey = 'WEEK';
  previousMonths: MonthOption[] = [];
  selectedCommercial: string | null = null;

  currentDate = new Date();
  lastUpdate = new Date();
  kpis: StockReturnKpis | null = null;

  constructor(
    private stockReturnService: StockReturnService,
    private authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.previousMonths = buildPreviousMonthOptions();
    this.currentUser = this.authService.getCurrentUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isStoreKeeper = this.userService.hasProfile(UserProfile.STOREKEEPER)
      || this.userService.hasProfile(UserProfile.ADMIN);
    this.canSelectCommercial = !this.isPromoter;

    this.restoreState();
    this.refresh();
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.saveState();
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  get periodLabel(): string {
    return getStockPeriodLabel(this.selectedPeriod);
  }

  get listFilter(): StockListFilter {
    const range = resolveStockPeriodRange(this.selectedPeriod);
    return {
      collector: this.selectedCommercial,
      startDate: range.startDate,
      endDate: range.endDate
    };
  }

  refresh(): void {
    this.loadKpis();
    this.loadReturns();
  }

  loadKpis(): void {
    this.stockReturnService.getKpis(this.listFilter).subscribe({
      next: (kpis) => { this.kpis = kpis; },
      error: (err) => console.error('Erreur chargement KPI retours stock', err)
    });
  }

  loadReturns(): void {
    this.isLoading = true;
    this.stockReturnService.getAll(this.listFilter, this.page, this.size).subscribe({
      next: (page) => {
        this.handlePage(page);
        this.lastUpdate = new Date();
        this.isLoading = false;
        this.saveState();
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des retours');
      }
    });
  }

  handlePage(page: any): void {
    this.returns = page.content;
    this.totalElements = page.page?.totalElements ?? page.totalElements ?? 0;
  }

  onPeriodChange(): void {
    this.page = 0;
    this.saveState();
    this.refresh();
  }

  onCommercialSelected(commercial: string | null): void {
    this.selectedCommercial = commercial;
    this.page = 0;
    this.saveState();
    this.refresh();
  }

  resetFilters(): void {
    this.selectedPeriod = 'WEEK';
    this.selectedCommercial = null;
    this.page = 0;
    this.saveState();
    this.refresh();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.saveState();
    this.loadReturns();
  }

  validate(stockReturn: StockReturn): void {
    this.alertService.showConfirmation('Confirmation', 'Confirmer la réception de ce retour ?').then((confirmed) => {
      if (confirmed) {
        this.stockReturnService.validate(stockReturn.id!).subscribe({
          next: () => {
            this.toastr.success('Retour validé et stock mis à jour');
            this.refresh();
          },
          error: (err) => this.toastr.error(err.error?.message || 'Erreur lors de la validation')
        });
      }
    });
  }

  cancel(ret: StockReturn): void {
    this.alertService.showConfirmation('Confirmation', 'Annuler ce retour ?').then((confirmed) => {
      if (confirmed) {
        this.stockReturnService.cancel(ret.id!).subscribe({
          next: () => {
            this.toastr.success('Retour annulé');
            this.refresh();
          },
          error: (err) => {
            this.alertService.showError(err.error?.message ?? 'Une erreur s\'est produite lors de l\'annulation', 'Erreur d\'annulation');
          }
        });
      }
    });
  }

  refuse(ret: StockReturn): void {
    this.alertService.showConfirmation('Confirmation', 'Refuser ce retour ?').then((confirmed) => {
      if (confirmed) {
        this.stockReturnService.refuse(ret.id!).subscribe({
          next: () => {
            this.toastr.success('Retour refusé');
            this.refresh();
          },
          error: (err) => {
            this.alertService.showError(err.error?.message ?? 'Une erreur s\'est produite lors du refus', 'Erreur de refus');
          }
        });
      }
    });
  }

  showDetails(stockReturn: StockReturn): void {
    this.selectedReturn = stockReturn;
  }

  closeDetails(): void {
    this.selectedReturn = null;
  }

  getStatusClass(status: string | undefined): string {
    switch (status) {
      case 'RECEIVED': return 'status-delivered';
      case 'CREATED': return 'status-pending';
      case 'CANCELLED':
      case 'REFUSED': return 'status-cancelled';
      default: return 'status-pending';
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

  private saveState(): void {
    const state: StockReturnListState = {
      selectedPeriod: this.selectedPeriod,
      selectedCommercial: this.selectedCommercial,
      page: this.page,
      size: this.size
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.STATE_KEY);
    if (!saved) return;
    try {
      const state = JSON.parse(saved) as StockReturnListState;
      this.selectedPeriod = state.selectedPeriod ?? 'WEEK';
      this.selectedCommercial = state.selectedCommercial ?? null;
      this.page = state.page ?? 0;
      this.size = state.size ?? 10;
    } catch (e) {
      console.error('Erreur restauration état liste retours stock', e);
    }
  }
}
