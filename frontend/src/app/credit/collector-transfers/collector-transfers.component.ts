import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { CollectorTransferService } from '../service/collector-transfer.service';
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

  summary: CollectorTransferSummary = {
    creditCount: 0,
    totalSalesAmount: 0,
    totalPaidAtTransfer: 0,
    totalRemainingAtTransfer: 0,
    byPair: []
  };
  details: CollectorTransferDetail[] = [];
  filteredDetails: CollectorTransferDetail[] = [];

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
    private readonly router: Router
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

    this.loadDetails(filters);
  }

  onOldCollectorSelected(username: string | null): void {
    this.oldCollector = username || '';
    this.selectedPairKey = null;
    this.saveState();
    this.loadData();
  }

  onNewCollectorSelected(username: string | null): void {
    this.newCollector = username || '';
    this.selectedPairKey = null;
    this.saveState();
    this.loadData();
  }

  onDateChanged(): void {
    this.selectedPairKey = null;
    this.saveState();
    this.loadData();
  }

  clearFilters(): void {
    this.oldCollector = '';
    this.newCollector = '';
    this.fromDate = '';
    this.toDate = '';
    this.selectedPairKey = null;
    this.saveState();
    this.loadData();
  }

  selectPair(pair: CollectorTransferPair): void {
    const key = this.pairKey(pair);
    this.selectedPairKey = this.selectedPairKey === key ? null : key;
    this.applyDetailFilter();
    this.saveState();
  }

  isPairSelected(pair: CollectorTransferPair): boolean {
    return this.selectedPairKey === this.pairKey(pair);
  }

  openCredit(creditId: number): void {
    this.saveState();
    this.router.navigate(['/credit/details', creditId]);
  }

  private loadDetails(filters: CollectorTransferFilters): void {
    this.loadingDetails = true;
    this.collectorTransferService.getDetails(filters).subscribe({
      next: (res: any) => {
        this.details = Array.isArray(res?.data) ? res.data : [];
        this.applyDetailFilter();
        this.loadingDetails = false;
        this.lastUpdate = new Date();
      },
      error: () => {
        this.details = [];
        this.filteredDetails = [];
        this.loadingDetails = false;
      }
    });
  }

  private applyDetailFilter(): void {
    if (!this.selectedPairKey) {
      this.filteredDetails = [...this.details];
      return;
    }
    this.filteredDetails = this.details.filter(
      (d) => this.pairKey({ oldCollector: d.oldCollector, newCollector: d.newCollector } as CollectorTransferPair)
        === this.selectedPairKey
    );
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

  private saveState(): void {
    const state: CollectorTransfersState = {
      oldCollector: this.oldCollector,
      newCollector: this.newCollector,
      fromDate: this.fromDate,
      toDate: this.toDate,
      selectedPairKey: this.selectedPairKey
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
    } catch {
      // ignore corrupted state
    }
  }
}
