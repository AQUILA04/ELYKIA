import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Observable } from 'rxjs';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TontineDeliveryService } from '../../services/tontine-delivery.service';
import { StockTontineRequestService, TontineDeliveryStockPreview } from 'src/app/stock-tontine/services/stock-tontine-request.service';
import { TontineDeliveryStockRequestModalComponent } from '../../components/modals/tontine-delivery-stock-request-modal/tontine-delivery-stock-request-modal.component';
import { TontineReceiptVerifyDialogComponent } from '../../components/modals/tontine-receipt-verify-dialog/tontine-receipt-verify-dialog.component';
import { TontineDeliveryKpi, TontineDeliveryListItem } from '../../models/tontine-delivery-list.model';
import {
  TONTINE_DELIVERY_STATUS_LABELS,
  TontineMemberDeliveryStatus
} from '../../types/tontine.types';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';
import { AlertService } from 'src/app/shared/service/alert.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import { UserService } from 'src/app/user/service/user.service';
import { UserProfile } from 'src/app/shared/models/user-profile.enum';
import { KpiFinancierPermissions } from 'src/app/shared/constants/kpi-financier-permission.constant';

interface DeliveryListState {
  searchTerm: string;
  currentPage: number;
  pageSize: number;
  selectedCommercial: string | null;
  dateFrom: string;
  dateTo: string;
  activePeriod: string;
  customDateStart: string;
  customDateEnd: string;
}

@Component({
  selector: 'app-tontine-delivery-list',
  templateUrl: './tontine-delivery-list.component.html',
  styleUrls: ['./tontine-delivery-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class TontineDeliveryListComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'tontineDeliveryListState';
  private dateIntervalId?: ReturnType<typeof setInterval>;

  deliveries: TontineDeliveryListItem[] = [];
  deliveryKpis: TontineDeliveryKpi | null = null;
  selectedIds = new Set<number>();
  pendingCount = 0;
  actionBusy = false;
  receiptBusyId: number | null = null;
  canValidate = false;
  canRequestStock = false;

  currentPage = 0;
  pageSize = 10;
  totalElement = 0;
  isLoading = true;
  searchTerm = '';
  selectedCommercial: string | null = null;
  isCommercialLogged = false;

  dateFrom = '';
  dateTo = '';
  activePeriod = 'month';
  customDateRange = { start: '', end: '' };
  today = new Date().toISOString().split('T')[0];

  currentDate = new Date();
  lastUpdate = new Date();

  constructor(
    private deliveryService: TontineDeliveryService,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private alertService: AlertService,
    private authService: AuthService,
    private userService: UserService,
    private dialog: MatDialog,
    private stockRequestService: StockTontineRequestService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.canValidate = this.authService.hasRole('ROLE_REPORT') || this.authService.hasRole('ROLE_ADMIN');
    this.canRequestStock = this.authService.hasRole('ROLE_ORDER_STOCK_REQUEST');
    this.checkIfCommercial();
    this.restoreState();
    if (!this.dateFrom || !this.dateTo) {
      this.selectPeriod(this.activePeriod);
    } else {
      this.loadData();
    }
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

  checkIfCommercial(): void {
    if (this.userService.hasProfile(UserProfile.PROMOTER)) {
      this.isCommercialLogged = true;
      this.selectedCommercial = this.tokenStorage.getUser()?.username || null;
    }
  }

  loadData(): void {
    this.loadKpis();
    this.loadPendingCount();
    this.loadDeliveries();
  }

  loadKpis(): void {
    void this.authService.hasPermission(KpiFinancierPermissions.TontineLivraison).then((allowed) => {
      if (!allowed) {
        this.deliveryKpis = null;
        return;
      }
      const commercial = this.getEffectiveCommercial();
      this.deliveryService.getDeliveryKpis(this.dateFrom, this.dateTo, commercial, this.searchTerm || undefined)
        .subscribe({
          next: (res) => {
            if (res.statusCode === 200 && res.data) {
              this.deliveryKpis = res.data;
              this.lastUpdate = new Date();
            }
          },
          error: (err) => console.error('Erreur chargement KPI livraisons', err)
        });
    });
  }

  loadDeliveries(): void {
    this.isLoading = true;
    const commercial = this.getEffectiveCommercial();

    const request$ = this.searchTerm.trim()
      ? this.deliveryService.elasticSearchDeliveries(
          this.searchTerm.trim(),
          this.dateFrom,
          this.dateTo,
          commercial,
          this.currentPage,
          this.pageSize
        )
      : this.deliveryService.getDeliveries(
          this.dateFrom,
          this.dateTo,
          commercial,
          undefined,
          this.currentPage,
          this.pageSize
        );

    request$.subscribe({
      next: (data) => {
        if (data.statusCode === 200 && data.data) {
          this.deliveries = [...data.data.content];
          this.totalElement = data.data.page?.totalElements ?? data.data.totalElements ?? 0;
          this.lastUpdate = new Date();
        } else {
          this.alertService.showError(data.message || 'Une erreur est survenue');
        }
        this.isLoading = false;
        this.saveState();
      },
      error: (err) => {
        this.isLoading = false;
        this.alertService.showError('Erreur de communication avec le serveur');
        console.error(err);
      }
    });
  }

  onSearch(): void {
    this.clearSelection();
    this.currentPage = 0;
    this.saveState();
    this.loadData();
  }

  clearSearch(): void {
    this.clearSelection();
    this.searchTerm = '';
    this.currentPage = 0;
    this.saveState();
    this.loadData();
  }

  refresh(): void {
    this.loadData();
  }

  resetFilters(): void {
    this.clearSelection();
    this.searchTerm = '';
    if (!this.isCommercialLogged) {
      this.selectedCommercial = null;
    }
    this.currentPage = 0;
    this.selectPeriod('month');
  }

  onPageChange(event: PageEvent): void {
    this.clearSelection();
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveState();
    this.loadDeliveries();
  }

  onCommercialSelected(commercial: string | null): void {
    if (this.isCommercialLogged) {
      return;
    }
    this.clearSelection();
    this.selectedCommercial = commercial;
    this.currentPage = 0;
    this.saveState();
    this.loadData();
  }

  selectPeriod(period: string): void {
    this.activePeriod = period;
    if (period !== 'custom') {
      const dates = this.calculateDatesForPeriod(period);
      this.clearSelection();
      this.dateFrom = dates.from;
      this.dateTo = dates.to;
      this.currentPage = 0;
      this.saveState();
      this.loadData();
    }
  }

  applyCustomDateRange(): void {
    if (this.customDateRange.start && this.customDateRange.end) {
      this.activePeriod = 'custom';
      this.clearSelection();
      this.dateFrom = this.customDateRange.start;
      this.dateTo = this.customDateRange.end;
      this.currentPage = 0;
      this.saveState();
      this.loadData();
    }
  }

  viewMember(memberId: number): void {
    this.saveState();
    this.router.navigate(['/tontine/member', memberId]);
  }

  openVerifyReceipt(): void {
    this.dialog.open(TontineReceiptVerifyDialogComponent, {
      width: '480px'
    });
  }

  downloadReceipt(delivery: TontineDeliveryListItem): void {
    if (this.receiptBusyId != null) {
      return;
    }
    this.receiptBusyId = delivery.id;
    this.deliveryService.downloadReceipt(delivery.id).subscribe({
      next: (blob) => {
        this.receiptBusyId = null;
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        const safeRef = String(delivery.reference || delivery.id).replace(/[^a-zA-Z0-9_-]/g, '_');
        anchor.download = `recu-commande-tontine-${safeRef}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.receiptBusyId = null;
        this.alertService.toastError('Le reçu n\'a pas pu être téléchargé.', 'Erreur');
      }
    });
  }

  /** Date choisie pour le PDF des membres à livrer (par défaut : aujourd'hui). */
  plannedPdfDate = new Date().toISOString().split('T')[0];
  plannedPdfBusy = false;

  downloadPlannedDeliveries(): void {
    if (!this.plannedPdfDate || this.plannedPdfBusy) {
      return;
    }
    this.plannedPdfBusy = true;
    const commercial = this.getEffectiveCommercial();
    this.deliveryService.downloadPlannedDeliveriesPdf(this.plannedPdfDate, commercial).subscribe({
      next: (blob) => {
        this.plannedPdfBusy = false;
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `membres-a-livrer-${this.plannedPdfDate}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.plannedPdfBusy = false;
        this.alertService.toastError('Le PDF des membres à livrer n\'a pas pu être téléchargé.', 'Erreur');
      }
    });
  }

  getStatusLabel(status: TontineMemberDeliveryStatus): string {
    return TONTINE_DELIVERY_STATUS_LABELS[status] || status;
  }

  getStatusClass(status: TontineMemberDeliveryStatus): string {
    switch (status) {
      case TontineMemberDeliveryStatus.PENDING:
        return 'status-pending';
      case TontineMemberDeliveryStatus.VALIDATED:
        return 'status-validated';
      case TontineMemberDeliveryStatus.DELIVERED:
        return 'status-delivered';
      default:
        return 'status-default';
    }
  }

  get inProgressCount(): number {
    if (!this.deliveryKpis) {
      return 0;
    }
    return (this.deliveryKpis.pendingCount || 0) + (this.deliveryKpis.validatedCount || 0);
  }

  private getEffectiveCommercial(): string | null {
    if (this.isCommercialLogged) {
      return this.selectedCommercial;
    }
    return this.selectedCommercial || null;
  }

  private calculateDatesForPeriod(period: string): { from: string; to: string } {
    const today = new Date();
    const formatDate = (date: Date): string => {
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - offset * 60 * 1000);
      return localDate.toISOString().split('T')[0];
    };

    switch (period) {
      case 'today':
        return { from: formatDate(today), to: formatDate(today) };
      case 'week': {
        const firstDayOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        firstDayOfWeek.setDate(diff);
        return { from: formatDate(firstDayOfWeek), to: formatDate(today) };
      }
      case 'year': {
        const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
        return { from: formatDate(firstDayOfYear), to: formatDate(today) };
      }
      case 'month':
      default: {
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: formatDate(firstDayOfMonth), to: formatDate(today) };
      }
    }
  }

  isSelectable(delivery: TontineDeliveryListItem): boolean {
    return delivery.deliveryStatus === TontineMemberDeliveryStatus.PENDING
      || delivery.deliveryStatus === TontineMemberDeliveryStatus.VALIDATED;
  }

  isSelected(delivery: TontineDeliveryListItem): boolean {
    return this.selectedIds.has(delivery.id);
  }

  get selectableOnPage(): TontineDeliveryListItem[] {
    return this.deliveries.filter(delivery => this.isSelectable(delivery));
  }

  get allPageSelected(): boolean {
    const rows = this.selectableOnPage;
    return rows.length > 0 && rows.every(delivery => this.selectedIds.has(delivery.id));
  }

  get selectedDeliveries(): TontineDeliveryListItem[] {
    return this.deliveries.filter(delivery => this.selectedIds.has(delivery.id));
  }

  get canValidateSelection(): boolean {
    return this.canValidate
      && this.selectedDeliveries.length > 0
      && this.selectedDeliveries.every(delivery => delivery.deliveryStatus === TontineMemberDeliveryStatus.PENDING);
  }

  toggleDelivery(delivery: TontineDeliveryListItem, checked: boolean): void {
    if (!this.isSelectable(delivery)) {
      return;
    }
    if (checked) {
      this.selectedIds.add(delivery.id);
    } else {
      this.selectedIds.delete(delivery.id);
    }
    this.selectedIds = new Set(this.selectedIds);
  }

  togglePage(checked: boolean): void {
    if (checked) {
      this.selectableOnPage.forEach(delivery => this.selectedIds.add(delivery.id));
    } else {
      this.selectableOnPage.forEach(delivery => this.selectedIds.delete(delivery.id));
    }
    this.selectedIds = new Set(this.selectedIds);
  }

  clearSelection(): void {
    this.selectedIds = new Set<number>();
  }

  validateSelection(): void {
    if (!this.canValidateSelection || this.actionBusy) {
      return;
    }
    const ids = this.selectedDeliveries.map(delivery => delivery.id);
    void this.alertService.showConfirmation(
      'Valider la sélection',
      `Valider ${ids.length} livraison(s) en attente ?`,
      'Valider',
      'Annuler'
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.actionBusy = true;
      this.deliveryService.validateSelection(ids).subscribe({
        next: (response) => this.afterBulk(response?.data?.count ?? ids.length, 'validée'),
        error: (err) => this.failBulk(err)
      });
    });
  }

  validateAllPending(): void {
    if (!this.canValidate || this.actionBusy || this.pendingCount === 0) {
      return;
    }
    const commercial = this.selectedCommercial ? ` de ${this.selectedCommercial}` : '';
    void this.alertService.showConfirmation(
      'Tout valider',
      `Valider ${this.pendingCount} livraison(s) en attente${commercial} ?`,
      'Valider',
      'Annuler'
    ).then((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.actionBusy = true;
      const filters = this.currentFilters();
      this.deliveryService.validatePending(filters.dateFrom, filters.dateTo, filters.commercial, filters.search)
        .subscribe({
          next: (response) => this.afterBulk(response?.data?.count ?? 0, 'validée'),
          error: (err) => this.failBulk(err)
        });
    });
  }

  requestStockForSelection(): void {
    const ids = [...this.selectedIds];
    if (!this.canRequestStock || this.actionBusy || ids.length === 0) {
      return;
    }
    this.actionBusy = true;
    this.stockRequestService.previewFromDeliveries(ids).subscribe({
      next: (preview) => this.openStockPreview(preview, () => this.stockRequestService.createFromDeliveries(ids)),
      error: (err) => this.failBulk(err)
    });
  }

  requestStockForAllPending(): void {
    if (!this.canRequestStock || this.actionBusy || this.pendingCount === 0) {
      return;
    }
    this.actionBusy = true;
    const filters = this.currentFilters();
    this.stockRequestService.previewPendingDeliveries(filters).subscribe({
      next: (preview) => this.openStockPreview(
        preview,
        () => this.stockRequestService.createFromPendingDeliveries(filters)
      ),
      error: (err) => this.failBulk(err)
    });
  }

  private openStockPreview(preview: TontineDeliveryStockPreview, create: () => Observable<unknown>): void {
    this.actionBusy = false;
    if (!preview?.groups?.length) {
      this.alertService.showWarning('Aucune livraison en attente éligible pour une demande de stock.');
      return;
    }
    this.dialog.open(TontineDeliveryStockRequestModalComponent, {
      width: '560px',
      data: preview
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }
      this.actionBusy = true;
      create().subscribe({
        next: () => {
          const count = preview.groups.length;
          this.actionBusy = false;
          this.clearSelection();
          this.alertService.showSuccess(
            count > 1 ? `${count} demandes de stock créées` : 'Demande de stock créée'
          );
          this.loadData();
        },
        error: (err) => this.failBulk(err)
      });
    });
  }

  private afterBulk(count: number, verb: string): void {
    this.actionBusy = false;
    this.clearSelection();
    if (count === 0) {
      this.alertService.showWarning('Aucune livraison en attente à valider.');
      this.loadData();
      return;
    }
    this.alertService.showSuccess(count === 1 ? `1 livraison ${verb}` : `${count} livraisons ${verb}s`);
    this.loadData();
  }

  private failBulk(err: any): void {
    this.actionBusy = false;
    this.alertService.showError(err?.error?.message || err?.message || 'Une erreur est survenue');
  }

  private loadPendingCount(): void {
    const filters = this.currentFilters();
    this.deliveryService.countPending(filters.dateFrom, filters.dateTo, filters.commercial, filters.search)
      .subscribe({
        next: (response) => {
          this.pendingCount = response?.data?.count ?? 0;
        },
        error: () => {
          this.pendingCount = 0;
        }
      });
  }

  private currentFilters(): { dateFrom: string; dateTo: string; commercial?: string | null; search?: string } {
    return {
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      commercial: this.getEffectiveCommercial(),
      search: this.searchTerm.trim() || undefined
    };
  }

  private saveState(): void {
    const state: DeliveryListState = {
      searchTerm: this.searchTerm,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      selectedCommercial: this.selectedCommercial,
      dateFrom: this.dateFrom,
      dateTo: this.dateTo,
      activePeriod: this.activePeriod,
      customDateStart: this.customDateRange.start,
      customDateEnd: this.customDateRange.end
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    const saved = sessionStorage.getItem(this.STATE_KEY);
    if (!saved) {
      return;
    }
    try {
      const state = JSON.parse(saved) as DeliveryListState;
      this.searchTerm = state.searchTerm ?? '';
      this.currentPage = state.currentPage ?? 0;
      this.pageSize = state.pageSize ?? 10;
      if (!this.isCommercialLogged) {
        this.selectedCommercial = state.selectedCommercial ?? null;
      }
      this.dateFrom = state.dateFrom ?? '';
      this.dateTo = state.dateTo ?? '';
      this.activePeriod = state.activePeriod ?? 'month';
      if (this.activePeriod === 'custom') {
        this.customDateRange = {
          start: state.customDateStart || state.dateFrom || '',
          end: state.customDateEnd || state.dateTo || ''
        };
      }
    } catch (e) {
      console.error('Erreur restauration état liste livraisons', e);
    }
  }
}
