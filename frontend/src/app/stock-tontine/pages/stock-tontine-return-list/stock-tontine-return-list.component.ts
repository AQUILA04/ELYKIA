import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { StockTontineReturn, StockTontineReturnItem, StockTontineReturnListItem } from '../../models/stock-tontine-return.model';
import { StockTontineReturnService } from '../../services/stock-tontine-return.service';
import { StockListFilter } from '../../../stock/services/stock-request.service';
import { StockReturnKpis } from '../../../stock/services/stock-return.service';
import { coerceStockItems, formatArticleLabel } from '../../../stock/utils/stock-detail.util';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  buildPreviousMonthOptions,
  getStockPeriodLabel,
  MonthOption,
  resolveStockPeriodRange,
  StockPeriodKey
} from '../../../stock/utils/stock-period.util';

interface StockTontineReturnListState {
  selectedPeriod: StockPeriodKey;
  selectedCommercial: string | null;
  page: number;
  size: number;
}

@Component({
  selector: 'app-stock-tontine-return-list',
  templateUrl: './stock-tontine-return-list.component.html',
  styleUrls: ['./stock-tontine-return-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockTontineReturnListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'stockTontineReturnListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  returns: StockTontineReturnListItem[] = [];
  page = 0;
  size = 10;
  totalElements = 0;
  isLoading = true;
  exportLoading = false;
  processingId: number | null = null;

  isPromoter = false;
  isStoreKeeper = false;
  canSelectCommercial = false;

  currentUser: any;
  selectedReturn: StockTontineReturn | null = null;
  detailsLoading = false;

  selectedPeriod: StockPeriodKey = 'WEEK';
  previousMonths: MonthOption[] = [];
  selectedCommercial: string | null = null;

  currentDate = new Date();
  lastUpdate = new Date();
  kpis: StockReturnKpis | null = null;

  constructor(
    private returnService: StockTontineReturnService,
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
    this.returnService.getKpis(this.listFilter).subscribe({
      next: (kpis) => { this.kpis = kpis; },
      error: (err) => console.error('Erreur chargement KPI retours tontine', err)
    });
  }

  loadReturns(): void {
    this.isLoading = true;
    this.returnService.getAllReturns(this.listFilter, this.page, this.size).subscribe({
      next: (page) => {
        this.returns = page.content;
        this.totalElements = page.totalElements ?? 0;
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

  onExportPdf(): void {
    const range = resolveStockPeriodRange(this.selectedPeriod);
    this.exportLoading = true;
    this.returnService.exportPdf(range.startDate, range.endDate, this.selectedCommercial).subscribe({
      next: (data) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fiche_retours_stock_tontine_${range.startDate}_${range.endDate}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exportLoading = false;
        this.alertService.toastSuccess('Fiche des retours tontine téléchargée avec succès');
      },
      error: (err) => {
        console.error('Export error', err);
        this.alertService.toastError('Erreur lors du téléchargement du PDF');
        this.exportLoading = false;
      }
    });
  }

  validate(stockReturn: StockTontineReturnListItem): void {
    if (!stockReturn.id || this.processingId === stockReturn.id) {
      return;
    }
    this.alertService.showConfirmation('Confirmation', 'Confirmer la réception de ce retour ?').then((confirmed) => {
      if (confirmed) {
        this.processingId = stockReturn.id!;
        this.returnService.validate(stockReturn.id!).pipe(
          finalize(() => { this.processingId = null; })
        ).subscribe({
          next: () => {
            this.toastr.success('Retour validé et stock mis à jour');
            this.refresh();
          },
          error: (err) => this.toastr.error(err.error?.message || 'Erreur lors de la validation')
        });
      }
    });
  }

  showDetails(stockReturn: StockTontineReturnListItem): void {
    if (!stockReturn.id) {
      return;
    }
    this.selectedReturn = null;
    this.detailsLoading = true;
    forkJoin({
      detail: this.returnService.getById(stockReturn.id),
      items: this.returnService.getItemsById(stockReturn.id)
    }).subscribe({
      next: ({ detail, items }) => {
        this.selectedReturn = {
          ...detail,
          items: coerceStockItems(items)
        };
        this.detailsLoading = false;
      },
      error: () => {
        this.detailsLoading = false;
        this.toastr.error('Erreur lors du chargement du détail', 'Erreur');
      }
    });
  }

  formatArticleLabel(article: StockTontineReturnItem['article']): string {
    return formatArticleLabel(article);
  }

  closeDetails(): void {
    this.selectedReturn = null;
    this.detailsLoading = false;
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
    const state: StockTontineReturnListState = {
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
      const state = JSON.parse(saved) as StockTontineReturnListState;
      this.selectedPeriod = state.selectedPeriod ?? 'WEEK';
      this.selectedCommercial = state.selectedCommercial ?? null;
      this.page = state.page ?? 0;
      this.size = state.size ?? 10;
    } catch (e) {
      console.error('Erreur restauration état liste retours tontine', e);
    }
  }
}
