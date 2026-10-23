import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { StockReturn, StockReturnItem, StockReturnListItem } from '../../models/stock-return.model';
import { StockListFilter } from '../../services/stock-request.service';
import { StockReturnKpis, StockReturnService } from '../../services/stock-return.service';
import { StockTontineReturnService } from '../../../stock-tontine/services/stock-tontine-return.service';
import { StockChannel } from '../../models/stock-channel';
import { StockChannelService } from '../../services/stock-channel.service';
import { coerceStockItems, formatArticleLabel } from '../../utils/stock-detail.util';
import { Observable, forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
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
  private dateIntervalId?: ReturnType<typeof setInterval>;
  private channelReady = false;

  channel: StockChannel = 'credit';

  returns: StockReturnListItem[] = [];
  page = 0;
  size = 10;
  totalElements = 0;
  isLoading = true;
  exportLoading = false;
  exportSelectionLoading = false;
  processingId: number | null = null;
  selectedReturnIds = new Set<number>();

  isPromoter = false;
  isStoreKeeper = false;
  canSelectCommercial = false;

  currentUser: any;
  selectedReturn: StockReturn | null = null;
  detailsLoading = false;

  selectedPeriod: StockPeriodKey = 'WEEK';
  previousMonths: MonthOption[] = [];
  selectedCommercial: string | null = null;

  currentDate = new Date();
  lastUpdate = new Date();
  kpis: StockReturnKpis | null = null;

  constructor(
    private stockReturnService: StockReturnService,
    private tontineReturnService: StockTontineReturnService,
    private stockChannel: StockChannelService,
    private authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService,
    private alertService: AlertService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  private get stateKey(): string {
    return this.channel === 'tontine' ? 'stockTontineReturnListState' : 'stockReturnListState';
  }

  private loadPage(filter: StockListFilter, page: number, size: number): Observable<any> {
    if (this.channel === 'tontine') {
      return this.tontineReturnService.getAllReturns(filter, page, size);
    }
    return this.stockReturnService.getAll(filter, page, size);
  }

  private kpisApi() {
    return this.channel === 'tontine' ? this.tontineReturnService : this.stockReturnService;
  }

  private exportApi() {
    return this.channel === 'tontine' ? this.tontineReturnService : this.stockReturnService;
  }

  private detailApi() {
    return this.channel === 'tontine' ? this.tontineReturnService : this.stockReturnService;
  }

  ngOnInit(): void {
    this.previousMonths = buildPreviousMonthOptions();
    this.currentUser = this.authService.getCurrentUser();
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isStoreKeeper = this.userService.hasProfile(UserProfile.STOREKEEPER)
      || this.userService.hasProfile(UserProfile.ADMIN);

    this.route.queryParamMap.subscribe(params => {
      const next = this.stockChannel.resolve(params.get('channel'));
      if (params.get('channel') !== next) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { channel: next },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        return;
      }
      const changed = this.channelReady && this.channel !== next;
      this.channel = next;
      this.stockChannel.remember(next);
      this.canSelectCommercial = !this.isPromoter;
      if (changed) {
        this.closeDetails();
        this.selectedReturnIds.clear();
        this.page = 0;
      }
      this.restoreState();
      if (!this.canSelectCommercial) {
        this.selectedCommercial = null;
      }
      this.refresh();
      if (!changed) {
        this.openDetailsFromQueryParam();
      }
      this.channelReady = true;
    });

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

  get pageTitle(): string {
    return this.channel === 'tontine' ? 'Retours stock tontine' : 'Retours stock';
  }

  get pageSubtitle(): string {
    const kind = this.channel === 'tontine' ? 'tontine' : 'crédit';
    return `Retours de stock ${kind} · Filtres période et commercial conservés à la navigation`;
  }

  get breadcrumbLabel(): string {
    return this.channel === 'tontine' ? 'Mon stock tontine' : 'Mon stock';
  }

  onChannelChange(channel: StockChannel): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { channel, id: null },
      queryParamsHandling: 'merge'
    });
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
    this.kpisApi().getKpis(this.listFilter).subscribe({
      next: (kpis) => { this.kpis = kpis; },
      error: (err) => console.error('Erreur chargement KPI retours stock', err)
    });
  }

  loadReturns(): void {
    this.isLoading = true;
    this.loadPage(this.listFilter, this.page, this.size).subscribe({
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
    this.syncSelectionWithCurrentData();
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
    this.exportApi().exportPdf(range.startDate, range.endDate, this.selectedCommercial).subscribe({
      next: (data) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const prefix = this.channel === 'tontine' ? 'fiche_retours_stock_tontine' : 'fiche_retours_stock';
        link.download = `${prefix}_${range.startDate}_${range.endDate}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exportLoading = false;
        this.alertService.toastSuccess('Fiche des retours téléchargée avec succès');
      },
      error: (err) => {
        console.error('Export error', err);
        this.alertService.toastError('Erreur lors du téléchargement du PDF');
        this.exportLoading = false;
      }
    });
  }

  get selectedCount(): number {
    return this.selectedReturnIds.size;
  }

  get hasSelectedReturns(): boolean {
    return this.selectedCount > 0;
  }

  get areAllCurrentPageSelected(): boolean {
    const selectableIds = this.returns.map(ret => ret.id).filter((id): id is number => !!id);
    return selectableIds.length > 0 && selectableIds.every(id => this.selectedReturnIds.has(id));
  }

  toggleSelectAllCurrentPage(checked: boolean): void {
    this.returns.forEach(ret => {
      if (!ret.id) return;
      if (checked) {
        this.selectedReturnIds.add(ret.id);
      } else {
        this.selectedReturnIds.delete(ret.id);
      }
    });
  }

  toggleReturnSelection(stockReturn: StockReturnListItem, checked: boolean): void {
    if (!stockReturn.id) return;
    if (checked) {
      this.selectedReturnIds.add(stockReturn.id);
    } else {
      this.selectedReturnIds.delete(stockReturn.id);
    }
  }

  isReturnSelected(stockReturn: StockReturnListItem): boolean {
    return !!stockReturn.id && this.selectedReturnIds.has(stockReturn.id);
  }

  onExportSelectedPdf(): void {
    const requestIds = Array.from(this.selectedReturnIds.values());
    if (requestIds.length === 0) {
      return;
    }
    this.exportSelectionLoading = true;
    this.exportApi().exportPdfByRequestIds(requestIds).subscribe({
      next: (data) => {
        const prefix = this.channel === 'tontine' ? 'fiche_retours_stock_tontine_selection' : 'fiche_retours_stock_selection';
        this.downloadPdfBlob(data, `${prefix}_${new Date().getTime()}.pdf`);
        this.alertService.toastSuccess('Fiche des retours sélectionnés téléchargée avec succès');
        this.exportSelectionLoading = false;
      },
      error: () => {
        this.alertService.toastError('Erreur lors du téléchargement des retours sélectionnés');
        this.exportSelectionLoading = false;
      }
    });
  }

  onExportSingleReturnPdf(stockReturn: StockReturnListItem): void {
    if (!stockReturn.id) return;
    this.exportSelectionLoading = true;
    this.exportApi().exportPdfByRequestIds([stockReturn.id]).subscribe({
      next: (data) => {
        const prefix = this.channel === 'tontine' ? 'fiche_retour_stock_tontine' : 'fiche_retour_stock';
        this.downloadPdfBlob(data, `${prefix}_${stockReturn.id}.pdf`);
        this.alertService.toastSuccess('Fiche du retour téléchargée avec succès');
        this.exportSelectionLoading = false;
      },
      error: () => {
        this.alertService.toastError('Erreur lors du téléchargement de la fiche du retour');
        this.exportSelectionLoading = false;
      }
    });
  }

  validate(stockReturn: StockReturnListItem): void {
    if (!stockReturn.id || this.processingId === stockReturn.id) {
      return;
    }
    this.alertService.showConfirmation('Confirmation', 'Confirmer la réception de ce retour ?').then((confirmed) => {
      if (confirmed) {
        this.processingId = stockReturn.id!;
        this.detailApi().validate(stockReturn.id!).pipe(
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

  cancel(ret: StockReturnListItem): void {
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

  refuse(ret: StockReturnListItem): void {
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

  showDetails(stockReturn: StockReturnListItem): void {
    if (!stockReturn.id) {
      return;
    }
    this.selectedReturn = null;
    this.detailsLoading = true;
    forkJoin({
      detail: this.detailApi().getById(stockReturn.id),
      items: this.detailApi().getItemsById(stockReturn.id)
    }).subscribe({
      next: ({ detail, items }) => {
        this.selectedReturn = {
          ...detail,
          items: coerceStockItems(items)
        } as StockReturn;
        this.detailsLoading = false;
      },
      error: () => {
        this.detailsLoading = false;
        this.toastr.error('Erreur lors du chargement du détail', 'Erreur');
      }
    });
  }

  private openDetailsFromQueryParam(): void {
    const idParam = this.route.snapshot.queryParamMap.get('id');
    if (!idParam) {
      return;
    }
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return;
    }
    this.showDetails({ id } as StockReturnListItem);
  }

  formatArticleLabel(article: StockReturnItem['article']): string {
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

  private syncSelectionWithCurrentData(): void {
    const currentIds = new Set(this.returns.map(ret => ret.id).filter((id): id is number => !!id));
    this.selectedReturnIds.forEach(id => {
      if (!currentIds.has(id)) {
        this.selectedReturnIds.delete(id);
      }
    });
  }

  private downloadPdfBlob(data: Blob, filename: string): void {
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private saveState(): void {
    const state: StockReturnListState = {
      selectedPeriod: this.selectedPeriod,
      selectedCommercial: this.selectedCommercial,
      page: this.page,
      size: this.size
    };
    sessionStorage.setItem(this.stateKey, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.stateKey);
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
