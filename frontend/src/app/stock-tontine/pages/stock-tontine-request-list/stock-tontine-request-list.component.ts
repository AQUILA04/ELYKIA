import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from '../../../auth/service/auth.service';
import { UserService } from '../../../user/service/user.service';
import { UserProfile } from '../../../shared/models/user-profile.enum';
import { StockTontineRequest, StockTontineRequestListItem } from '../../models/stock-tontine-request.model';
import { StockTontineRequestService } from '../../services/stock-tontine-request.service';
import { StockListFilter, StockRequestKpis } from '../../../stock/services/stock-request.service';
import { coerceStockItems } from '../../../stock/utils/stock-detail.util';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  buildPreviousMonthOptions,
  getStockPeriodLabel,
  MonthOption,
  resolveStockPeriodRange,
  StockPeriodKey
} from '../../../stock/utils/stock-period.util';

interface StockTontineRequestListState {
  selectedPeriod: StockPeriodKey;
  selectedCommercial: string | null;
  page: number;
  size: number;
}

@Component({
  selector: 'app-stock-tontine-request-list',
  templateUrl: './stock-tontine-request-list.component.html',
  styleUrls: ['./stock-tontine-request-list.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StockTontineRequestListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'stockTontineRequestListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  requests: StockTontineRequestListItem[] = [];
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

  currentUser: any;
  selectedRequest: StockTontineRequest | null = null;
  detailsLoading = false;

  selectedPeriod: StockPeriodKey = 'WEEK';
  previousMonths: MonthOption[] = [];
  selectedCommercial: string | null = null;

  currentDate = new Date();
  lastUpdate = new Date();
  kpis: StockRequestKpis | null = null;

  constructor(
    private requestService: StockTontineRequestService,
    private authService: AuthService,
    private userService: UserService,
    private toastr: ToastrService,
    private alertService: AlertService
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
    this.canSelectCommercial = !this.isPromoter && (this.isManager || this.isSecretary);

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
    this.loadRequests();
  }

  loadKpis(): void {
    this.requestService.getKpis(this.listFilter).subscribe({
      next: (kpis) => { this.kpis = kpis; },
      error: (err) => console.error('Erreur chargement KPI demandes tontine', err)
    });
  }

  loadRequests(): void {
    this.isLoading = true;
    this.requestService.getAll(this.listFilter, this.page, this.size).subscribe({
      next: (page) => {
        this.requests = page.content;
        this.totalElement = page.totalElements ?? 0;
        this.lastUpdate = new Date();
        this.isLoading = false;
        this.saveState();
      },
      error: () => {
        this.toastr.error('Erreur lors du chargement des demandes');
        this.isLoading = false;
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
    this.loadRequests();
  }

  onExportPdf(): void {
    const range = resolveStockPeriodRange(this.selectedPeriod);
    this.exportLoading = true;
    this.requestService.exportPdf(range.startDate, range.endDate, this.selectedCommercial).subscribe({
      next: (data) => {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fiche_sortie_stock_tontine_${range.startDate}_${range.endDate}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exportLoading = false;
        this.alertService.toastSuccess('Fiche de sortie tontine téléchargée avec succès');
      },
      error: () => {
        this.alertService.toastError('Erreur lors du téléchargement du PDF');
        this.exportLoading = false;
      }
    });
  }

  validate(request: StockTontineRequestListItem): void {
    this.alertService.showConfirmation('Confirmation', 'Valider cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.requestService.validate(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande validée');
            this.refresh();
          },
          error: (err) => {
            this.alertService.showError(err.error?.message ?? 'Erreur de validation', 'Erreur de validation');
          }
        });
      }
    });
  }

  deliver(request: StockTontineRequestListItem): void {
    if (!request.id || this.processingId === request.id) {
      return;
    }
    this.alertService.showConfirmation('Confirmation', 'Confirmer la livraison de cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.processingId = request.id!;
        this.requestService.deliver(request.id!).pipe(
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

  cancel(request: StockTontineRequestListItem): void {
    this.alertService.showConfirmation('Confirmation', 'Annuler cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.requestService.cancel(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande annulée');
            this.refresh();
          },
          error: (err) => {
            this.alertService.showError(err.error?.message ?? 'Erreur d\'annulation', 'Erreur d\'annulation');
          }
        });
      }
    });
  }

  refuse(request: StockTontineRequestListItem): void {
    this.alertService.showConfirmation('Confirmation', 'Refuser cette demande ?').then((confirmed) => {
      if (confirmed) {
        this.requestService.refuse(request.id!).subscribe({
          next: () => {
            this.toastr.success('Demande refusée');
            this.refresh();
          },
          error: (err) => {
            this.alertService.showError(err.error?.message ?? 'Erreur de refus', 'Erreur de refus');
          }
        });
      }
    });
  }

  showDetails(request: StockTontineRequestListItem): void {
    if (!request.id) {
      return;
    }
    this.selectedRequest = null;
    this.detailsLoading = true;
    forkJoin({
      detail: this.requestService.getById(request.id),
      items: this.requestService.getItemsById(request.id)
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

  closeDetails(): void {
    this.selectedRequest = null;
    this.detailsLoading = false;
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
    const state: StockTontineRequestListState = {
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
      const state = JSON.parse(saved) as StockTontineRequestListState;
      this.selectedPeriod = state.selectedPeriod ?? 'WEEK';
      this.selectedCommercial = state.selectedCommercial ?? null;
      this.page = state.page ?? 0;
      this.size = state.size ?? 10;
    } catch (e) {
      console.error('Erreur restauration état liste demandes tontine', e);
    }
  }
}
