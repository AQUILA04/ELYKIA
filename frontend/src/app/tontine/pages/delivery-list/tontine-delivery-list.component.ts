import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TontineDeliveryService } from '../../services/tontine-delivery.service';
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
    private userService: UserService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
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
    this.loadDeliveries();
  }

  loadKpis(): void {
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
    this.currentPage = 0;
    this.saveState();
    this.loadData();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 0;
    this.saveState();
    this.loadData();
  }

  refresh(): void {
    this.loadData();
  }

  resetFilters(): void {
    this.searchTerm = '';
    if (!this.isCommercialLogged) {
      this.selectedCommercial = null;
    }
    this.currentPage = 0;
    this.selectPeriod('month');
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveState();
    this.loadDeliveries();
  }

  onCommercialSelected(commercial: string | null): void {
    if (this.isCommercialLogged) {
      return;
    }
    this.selectedCommercial = commercial;
    this.currentPage = 0;
    this.saveState();
    this.loadData();
  }

  selectPeriod(period: string): void {
    this.activePeriod = period;
    if (period !== 'custom') {
      const dates = this.calculateDatesForPeriod(period);
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
