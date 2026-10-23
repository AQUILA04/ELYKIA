import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { StockRequest, StockRequestListItem } from '../../models/stock-request.model';
import { StockListFilter, StockRequestKpis, StockRequestService } from '../../services/stock-request.service';
import { StockTontineRequestService } from '../../../stock-tontine/services/stock-tontine-request.service';
import { StockChannel } from '../../models/stock-channel';
import { StockChannelService } from '../../services/stock-channel.service';
import { coerceStockItems } from '../../utils/stock-detail.util';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  buildPreviousMonthOptions,
  getStockPeriodLabel,
  MonthOption,
  resolveStockPeriodRange,
  StockPeriodKey
} from '../../utils/stock-period.util';

interface StockRequestListState {
  selectedPeriod: StockPeriodKey;
  selectedCommercial: string | null;
  page: number;
  size: number;
}

@Component({
  selector: 'app-stock-request-list',
  templateUrl: './stock-request-list.component.html',
  styleUrls: ['./stock-request-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockRequestListComponent implements OnInit, OnDestroy {
  private dateIntervalId?: ReturnType<typeof setInterval>;
  private channelReady = false;

  channel: StockChannel = 'credit';

  requests: StockRequestListItem[] = [];
  page = 0;
  size = 10;
  totalElement = 0;
  isLoading = true;
  exportLoading = false;
  exportSelectionLoading = false;
  processingId: number | null = null;
  selectedRequestIds = new Set<number>();

  isManager = false;
  isStoreKeeper = false;
  isPromoter = false;
  isSecretary = false;
  canSelectCommercial = false;
  canEditStockRequest = false;

  currentUser: any;
  selectedRequest: StockRequest | null = null;
  detailReference: string | null = null;
  detailsLoading = false;

  selectedPeriod: StockPeriodKey = 'WEEK';
  previousMonths: MonthOption[] = [];
  selectedCommercial: string | null = null;

  currentDate = new Date();
  lastUpdate = new Date();
  kpis: StockRequestKpis | null = null;

  constructor(
    private stockRequestService: StockRequestService,
    private tontineRequestService: StockTontineRequestService,
    private stockChannel: StockChannelService,
    private authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService,
    private alertService: AlertService,
    private router: Router,
    private featureFlagService: FeatureFlagService,
    private route: ActivatedRoute
  ) {}

  private get stateKey(): string {
    return this.channel === 'tontine' ? 'stockTontineRequestListState' : 'stockRequestListState';
  }

  private requestApi() {
    return this.channel === 'tontine' ? this.tontineRequestService : this.stockRequestService;
  }

  ngOnInit(): void {
    this.previousMonths = buildPreviousMonthOptions();
    this.currentUser = this.authService.getCurrentUser();
    this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
    this.isStoreKeeper = this.userService.hasProfile(UserProfile.STOREKEEPER);
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isSecretary = this.userService.hasProfile(UserProfile.SECRETARY);
    const hasEditRole = this.authService.hasRole('ROLE_EDIT_STOCK_REQUEST');
    this.featureFlagService.flags$.subscribe(flags => {
      this.canEditStockRequest = hasEditRole && !!flags[FeatureFlags.EditStockRequest];
    });

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
      if (changed) {
        this.closeDetails();
        this.selectedRequestIds.clear();
        this.page = 0;
      }
      this.restoreState();
      this.applyCommercialFilterRights();
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
    return this.channel === 'tontine' ? 'Demandes de sortie tontine' : 'Demandes de sortie stock';
  }

  get pageSubtitle(): string {
    const kind = this.channel === 'tontine' ? 'tontine' : 'crédit';
    return `Demandes de sortie ${kind} · Filtres période et commercial conservés à la navigation`;
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

  private applyCommercialFilterRights(): void {
    if (this.channel === 'tontine') {
      this.canSelectCommercial = !this.isPromoter && (this.isManager || this.isSecretary);
    } else {
      this.canSelectCommercial = !this.isPromoter && (this.isManager || this.isSecretary || this.isStoreKeeper);
    }
    if (!this.canSelectCommercial) {
      this.selectedCommercial = null;
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
    this.loadRequests();
  }

  loadKpis(): void {
    this.requestApi().getKpis(this.listFilter).subscribe({
      next: (kpis) => { this.kpis = kpis; },
      error: (err) => console.error('Erreur chargement KPI demandes stock', err)
    });
  }

  loadRequests(): void {
    this.isLoading = true;
    this.requestApi().getAll(this.listFilter, this.page, this.size).subscribe({
      next: (page) => {
        this.handlePage(page);
        this.lastUpdate = new Date();
        this.isLoading = false;
        this.saveState();
      },
      error: () => {
        this.toastr.error('Erreur lors du chargement des demandes', 'Erreur');
        this.isLoading = false;
      }
    });
  }

  handlePage(page: any): void {
    this.requests = page.content;
    this.totalElement = page.page?.totalElements ?? page.totalElements ?? 0;
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

  pageChanged(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.saveState();
    this.loadRequests();
  }

  onExportPdf(): void {
    const range = resolveStockPeriodRange(this.selectedPeriod);
    this.exportLoading = true;
    this.requestApi().exportPdf(range.startDate, range.endDate, this.selectedCommercial).subscribe({
      next: (data) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const prefix = this.channel === 'tontine' ? 'fiche_sortie_stock_tontine' : 'fiche_sortie_stock';
        link.download = `${prefix}_${range.startDate}_${range.endDate}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exportLoading = false;
        this.alertService.toastSuccess('Fiche de sortie téléchargée avec succès');
      },
      error: (err) => {
        console.error('Export error', err);
        this.alertService.toastError('Erreur lors du téléchargement du PDF');
        this.exportLoading = false;
      }
    });
  }

  get selectedCount(): number {
    return this.selectedRequestIds.size;
  }

  get hasSelectedRequests(): boolean {
    return this.selectedCount > 0;
  }

  get areAllCurrentPageSelected(): boolean {
    const selectableIds = this.requests.map(req => req.id).filter((id): id is number => !!id);
    return selectableIds.length > 0 && selectableIds.every(id => this.selectedRequestIds.has(id));
  }

  toggleSelectAllCurrentPage(checked: boolean): void {
    this.requests.forEach(req => {
      if (!req.id) return;
      if (checked) {
        this.selectedRequestIds.add(req.id);
      } else {
        this.selectedRequestIds.delete(req.id);
      }
    });
  }

  toggleRequestSelection(request: StockRequestListItem, checked: boolean): void {
    if (!request.id) return;
    if (checked) {
      this.selectedRequestIds.add(request.id);
    } else {
      this.selectedRequestIds.delete(request.id);
    }
  }

  isRequestSelected(request: StockRequestListItem): boolean {
    return !!request.id && this.selectedRequestIds.has(request.id);
  }

  onExportSelectedPdf(): void {
    const requestIds = Array.from(this.selectedRequestIds.values());
    if (requestIds.length === 0) {
      return;
    }
    this.exportSelectionLoading = true;
    this.requestApi().exportPdfByRequestIds(requestIds).subscribe({
      next: (data) => {
        const prefix = this.channel === 'tontine' ? 'fiche_sortie_stock_tontine_selection' : 'fiche_sortie_stock_selection';
        this.downloadPdfBlob(data, `${prefix}_${new Date().getTime()}.pdf`);
        this.alertService.toastSuccess('Fiche de sortie sélectionnée téléchargée avec succès');
        this.exportSelectionLoading = false;
      },
      error: () => {
        this.alertService.toastError('Erreur lors du téléchargement de la fiche sélectionnée');
        this.exportSelectionLoading = false;
      }
    });
  }

  onExportSingleRequestPdf(request: StockRequestListItem): void {
    if (!request.id) {
      return;
    }
    this.exportSelectionLoading = true;
    this.requestApi().exportPdfByRequestIds([request.id]).subscribe({
      next: (data) => {
        const suffix = request.reference ?? `demande_${request.id}`;
        const prefix = this.channel === 'tontine' ? 'fiche_sortie_stock_tontine' : 'fiche_sortie_stock';
        this.downloadPdfBlob(data, `${prefix}_${suffix}.pdf`);
        this.alertService.toastSuccess('Fiche de la demande téléchargée avec succès');
        this.exportSelectionLoading = false;
      },
      error: () => {
        this.alertService.toastError('Erreur lors du téléchargement de la fiche de la demande');
        this.exportSelectionLoading = false;
      }
    });
  }

  validate(request: StockRequestListItem): void {
    this.alertService.showConfirmation('Confirmation', 'Valider cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.requestApi().validate(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande validée');
            this.refresh();
            this.reloadOpenDetail(request.id);
          },
          error: (err) => {
            this.alertService.showError(err.error?.message ?? 'Une erreur s\'est produite lors de la validation', 'Erreur de validation');
          }
        });
      }
    });
  }

  deliver(request: StockRequestListItem): void {
    if (!request.id || this.processingId === request.id) {
      return;
    }
    this.alertService.showConfirmation('Confirmation', 'Confirmer la livraison de cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.processingId = request.id!;
        this.requestApi().deliver(request.id!).pipe(
          finalize(() => { this.processingId = null; })
        ).subscribe({
          next: (resp: any) => {
            if (resp?.statusCode >= 400) {
              this.alertService.showError(resp.message ?? 'Erreur de livraison', 'Erreur de livraison');
              return;
            }
            const payload = resp.data || resp;
            if (payload?.deliveryType === 'PARTIAL') {
              const msg = `Livraison partielle effectuée.\nArticles livrés : ${payload.deliveredItems?.length || 0}.\nUne nouvelle demande ${payload.pendingRequestReference} a été créée pour les articles manquants.`;
              this.alertService.showInfo(msg, 'Livraison partielle');
            } else {
              this.toastr.success('Demande livrée entièrement');
            }
            this.refresh();
          },
          error: (err) => {
            this.alertService.showError(err.error?.message ?? 'Erreur de livraison', 'Erreur de livraison');
          }
        });
      }
    });
  }

  cancel(request: StockRequestListItem): void {
    this.alertService.showConfirmation('Confirmation', 'Annuler cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.requestApi().cancel(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande annulée');
            this.refresh();
          },
          error: (err) => {
            this.alertService.showError(err.error?.message ?? 'Une erreur s\'est produite lors de l\'annulation', 'Erreur d\'annulation');
          }
        });
      }
    });
  }

  refuse(request: StockRequestListItem): void {
    this.alertService.showConfirmation('Confirmation', 'Refuser cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.requestApi().refuse(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande refusée');
            this.refresh();
            this.reloadOpenDetail(request.id);
          },
          error: (err) => {
            this.alertService.showError(err.error?.message ?? 'Une erreur s\'est produite lors du refus', 'Erreur de refus');
          }
        });
      }
    });
  }

  showDetails(request: StockRequestListItem): void {
    if (!request.id) {
      return;
    }
    this.detailReference = request.reference ?? null;
    this.selectedRequest = null;
    this.detailsLoading = true;
    forkJoin({
      detail: this.requestApi().getById(request.id),
      items: this.requestApi().getItemsById(request.id)
    }).subscribe({
      next: ({ detail, items }) => {
        this.selectedRequest = {
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

  private openDetailsFromQueryParam(): void {
    const idParam = this.route.snapshot.queryParamMap.get('id');
    if (!idParam) {
      return;
    }
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return;
    }
    this.showDetails({ id } as StockRequestListItem);
  }

  closeDetails(): void {
    this.selectedRequest = null;
    this.detailReference = null;
    this.detailsLoading = false;
  }

  private reloadOpenDetail(requestId?: number): void {
    if (!requestId || this.selectedRequest?.id !== requestId) {
      return;
    }
    forkJoin({
      detail: this.requestApi().getById(requestId),
      items: this.requestApi().getItemsById(requestId)
    }).subscribe({
      next: ({ detail, items }) => {
        if (this.selectedRequest?.id !== requestId) {
          return;
        }
        this.selectedRequest = {
          ...detail,
          items: coerceStockItems(items)
        };
        this.detailReference = detail.reference ?? this.detailReference;
      }
    });
  }

  edit(request: StockRequestListItem): void {
    this.router.navigate(['/stock/request/edit', request.id], { queryParams: { channel: 'credit' } });
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return 'status-pending';
    switch (status) {
      case 'CREATED': return 'status-pending';
      case 'VALIDATED': return 'status-validated';
      case 'DELIVERED': return 'status-delivered';
      case 'CANCELLED':
      case 'REFUSED': return 'status-cancelled';
      default: return 'status-cancelled';
    }
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return '—';
    switch (status) {
      case 'CREATED': return 'Créé';
      case 'VALIDATED': return 'Validé';
      case 'DELIVERED': return 'Livré';
      case 'CANCELLED': return 'Annulé';
      case 'REFUSED': return 'Refusé';
      default: return status;
    }
  }

  private syncSelectionWithCurrentData(): void {
    const currentIds = new Set(this.requests.map(req => req.id).filter((id): id is number => !!id));
    this.selectedRequestIds.forEach(id => {
      if (!currentIds.has(id)) {
        this.selectedRequestIds.delete(id);
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
    const state: StockRequestListState = {
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
      const state = JSON.parse(saved) as StockRequestListState;
      this.selectedPeriod = state.selectedPeriod ?? 'WEEK';
      this.selectedCommercial = state.selectedCommercial ?? null;
      this.page = state.page ?? 0;
      this.size = state.size ?? 10;
    } catch (e) {
      console.error('Erreur restauration état liste demandes stock', e);
    }
  }
}
