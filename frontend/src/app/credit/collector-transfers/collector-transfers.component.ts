import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { CollectorTransferService } from '../service/collector-transfer.service';
import { AuthService } from 'src/app/auth/service/auth.service';
import { KpiFinancierPermissions } from 'src/app/shared/constants/kpi-financier-permission.constant';
import {
  CollectorTransferDetail,
  CollectorTransferFilters,
  CollectorTransferPair,
  CollectorTransferSummary
} from '../models/collector-transfer.model';

interface CollectorTransfersState {
  oldCollector: string;
  newCollector: string;
  fromDate: string;
  toDate: string;
  selectedPairKey: string | null;
  currentPage: number;
  pageSize: number;
}

@Component({
  selector: 'app-collector-transfers',
  templateUrl: './collector-transfers.component.html',
  styleUrls: ['./collector-transfers.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CollectorTransfersComponent implements OnInit, OnDestroy {
  private readonly STATE_KEY = 'collectorTransfersState';
  readonly pageSizeOptions = [10, 25, 50, 100];

  summary: CollectorTransferSummary = {
    creditCount: 0,
    totalSalesAmount: 0,
    totalPaidAtTransfer: 0,
    totalRemainingAtTransfer: 0,
    byPair: []
  };
  details: CollectorTransferDetail[] = [];
  totalDetails = 0;
  currentPage = 0;
  pageSize = 25;

  oldCollector = '';
  newCollector = '';
  fromDate = '';
  toDate = '';
  selectedPairKey: string | null = null;

  loading = false;
  loadingDetails = false;
  currentDate = new Date();
  lastUpdate = new Date();

  private clockInterval?: ReturnType<typeof setInterval>;

  constructor(
    private readonly collectorTransferService: CollectorTransferService,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.restoreState();
    this.loadData();
    this.clockInterval = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.saveState();
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  refresh(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const filters = this.buildFilters();

    void this.authService.hasPermission(KpiFinancierPermissions.TransfertVente).then((allowed) => {
      if (!allowed) {
        this.loading = false;
        return;
      }
      this.collectorTransferService.getSummary(filters).subscribe({
        next: (res: any) => {
          if (res?.data) {
            this.summary = res.data;
            this.lastUpdate = new Date();
            this.saveState();
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    });

    this.loadDetails();
  }

  onOldCollectorSelected(username: string | null): void {
    this.oldCollector = username || '';
    this.selectedPairKey = null;
    this.currentPage = 0;
    this.saveState();
    this.loadData();
  }

  onNewCollectorSelected(username: string | null): void {
    this.newCollector = username || '';
    this.selectedPairKey = null;
    this.currentPage = 0;
    this.saveState();
    this.loadData();
  }

  onDateChanged(): void {
    this.selectedPairKey = null;
    this.currentPage = 0;
    this.saveState();
    this.loadData();
  }

  clearFilters(): void {
    this.oldCollector = '';
    this.newCollector = '';
    this.fromDate = '';
    this.toDate = '';
    this.selectedPairKey = null;
    this.currentPage = 0;
    this.saveState();
    this.loadData();
  }

  selectPair(pair: CollectorTransferPair): void {
    const key = this.pairKey(pair);
    this.selectedPairKey = this.selectedPairKey === key ? null : key;
    this.currentPage = 0;
    this.saveState();
    this.loadDetails();
  }

  isPairSelected(pair: CollectorTransferPair): boolean {
    return this.selectedPairKey === this.pairKey(pair);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.saveState();
    this.loadDetails();
  }

  openCredit(creditId: number): void {
    this.saveState();
    this.router.navigate(['/credit/details', creditId]);
  }

  private loadDetails(): void {
    this.loadingDetails = true;
    this.collectorTransferService.getDetails(this.buildDetailFilters()).subscribe({
      next: (res: any) => {
        this.details = Array.isArray(res?.data?.content) ? res.data.content : [];
        this.totalDetails = res?.data?.page?.totalElements ?? res?.data?.totalElements ?? 0;
        this.loadingDetails = false;
        this.lastUpdate = new Date();
      },
      error: () => {
        this.details = [];
        this.totalDetails = 0;
        this.loadingDetails = false;
      }
    });
  }

  private pairKey(pair: Pick<CollectorTransferPair, 'oldCollector' | 'newCollector'>): string {
    return `${pair.oldCollector || ''}→${pair.newCollector || ''}`;
  }

  private buildFilters(): CollectorTransferFilters {
    return {
      oldCollector: this.oldCollector || null,
      newCollector: this.newCollector || null,
      fromDate: this.fromDate || null,
      toDate: this.toDate || null
    };
  }

  private buildDetailFilters(): CollectorTransferFilters {
    const filters = this.buildFilters();
    if (this.selectedPairKey) {
      const separator = this.selectedPairKey.indexOf('→');
      if (separator >= 0) {
        filters.oldCollector = this.selectedPairKey.slice(0, separator) || null;
        filters.newCollector = this.selectedPairKey.slice(separator + 1) || null;
      }
    }
    filters.page = this.currentPage;
    filters.size = this.pageSize;
    return filters;
  }

  private saveState(): void {
    const state: CollectorTransfersState = {
      oldCollector: this.oldCollector,
      newCollector: this.newCollector,
      fromDate: this.fromDate,
      toDate: this.toDate,
      selectedPairKey: this.selectedPairKey,
      currentPage: this.currentPage,
      pageSize: this.pageSize
    };
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  private restoreState(): void {
    try {
      const raw = sessionStorage.getItem(this.STATE_KEY);
      if (!raw) {
        return;
      }
      const state = JSON.parse(raw) as CollectorTransfersState;
      this.oldCollector = state.oldCollector || '';
      this.newCollector = state.newCollector || '';
      this.fromDate = state.fromDate || '';
      this.toDate = state.toDate || '';
      this.selectedPairKey = state.selectedPairKey || null;
      this.currentPage = Number.isInteger(state.currentPage) && state.currentPage >= 0 ? state.currentPage : 0;
      this.pageSize = Number.isInteger(state.pageSize) && state.pageSize > 0 ? state.pageSize : 25;
    } catch {
      // ignore corrupted state
    }
  }
}
