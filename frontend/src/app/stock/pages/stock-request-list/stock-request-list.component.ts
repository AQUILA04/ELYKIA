import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { Router } from '@angular/router';
import { FeatureFlagService, FeatureFlags } from 'src/app/shared/service/feature-flag.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { StockRequest, StockRequestListItem } from '../../models/stock-request.model';
import { StockListFilter, StockRequestKpis, StockRequestService } from '../../services/stock-request.service';
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
  private readonly STATE_KEY = 'stockRequestListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  requests: StockRequestListItem[] = [];
  page = 0;
  size = 10;
  totalElement = 0;
  isLoading = true;
  exportLoading = false;
  processingId: number | null = null;

  isManager = false;
  isStoreKeeper = false;
  isPromoter = false;
  isSecretary = false;
  canSelectCommercial = false;
  canEditStockRequest = false;

  currentUser: any;
  selectedRequest: StockRequest | null = null;
  detailsLoading = false;

  selectedPeriod: StockPeriodKey = 'WEEK';
  previousMonths: MonthOption[] = [];
  selectedCommercial: string | null = null;

  currentDate = new Date();
  lastUpdate = new Date();
  kpis: StockRequestKpis | null = null;

  constructor(
    private stockRequestService: StockRequestService,
    private authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService,
    private alertService: AlertService,
    private router: Router,
    private featureFlagService: FeatureFlagService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.previousMonths = buildPreviousMonthOptions();
    this.currentUser = this.authService.getCurrentUser();
    this.isManager = this.userService.hasProfile(UserProfile.GESTIONNAIRE)
      || this.userService.hasProfile(UserProfile.ADMIN)
      || this.userService.hasProfile(UserProfile.SUPER_ADMIN);
    this.isStoreKeeper = this.userService.hasProfile(UserProfile.STOREKEEPER);
    this.isPromoter = this.userService.hasProfile(UserProfile.PROMOTER);
    this.isSecretary = this.userService.hasProfile(UserProfile.SECRETARY);
    this.canSelectCommercial = !this.isPromoter && (this.isManager || this.isSecretary || this.isStoreKeeper);

    const hasEditRole = this.authService.hasRole('ROLE_EDIT_STOCK_REQUEST');
    this.featureFlagService.flags$.subscribe(flags => {
      this.canEditStockRequest = hasEditRole && !!flags[FeatureFlags.EditStockRequest];
    });

    this.restoreState();
    this.refresh();
    this.openDetailsFromQueryParam();
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
    this.loadRequests();
  }

  loadKpis(): void {
    this.stockRequestService.getKpis(this.listFilter).subscribe({
      next: (kpis) => { this.kpis = kpis; },
      error: (err) => console.error('Erreur chargement KPI demandes stock', err)
    });
  }

  loadRequests(): void {
    this.isLoading = true;
    this.stockRequestService.getAll(this.listFilter, this.page, this.size).subscribe({
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
    this.stockRequestService.exportPdf(range.startDate, range.endDate, this.selectedCommercial).subscribe({
      next: (data) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fiche_sortie_stock_${range.startDate}_${range.endDate}.pdf`;
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

  validate(request: StockRequestListItem): void {
    this.alertService.showConfirmation('Confirmation', 'Valider cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.stockRequestService.validate(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande validée');
            this.refresh();
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
        this.stockRequestService.deliver(request.id!).pipe(
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
        this.stockRequestService.cancel(request.id!).subscribe({
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
        this.stockRequestService.refuse(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande refusée');
            this.refresh();
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
    this.selectedRequest = null;
    this.detailsLoading = true;
    forkJoin({
      detail: this.stockRequestService.getById(request.id),
      items: this.stockRequestService.getItemsById(request.id)
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
    this.detailsLoading = false;
  }

  edit(request: StockRequestListItem): void {
    this.router.navigate(['/stock/request/edit', request.id]);
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

  private saveState(): void {
    const state: StockRequestListState = {
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
