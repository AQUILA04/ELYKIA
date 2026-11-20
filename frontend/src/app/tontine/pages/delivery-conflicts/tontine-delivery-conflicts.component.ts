import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { TontineDeliveryService } from '../../services/tontine-delivery.service';
import {
  CONFLICT_OPERATION_LABELS,
  CONFLICT_REASON_LABELS,
  TontineDeliveryConflict,
  TontineDeliveryConflictOutcome
} from '../../models/tontine-delivery-conflict.model';
import { AlertService } from 'src/app/shared/service/alert.service';
import { TokenStorageService } from 'src/app/shared/service/token-storage.service';

type ConflictPeriod = 'today' | 'week' | 'month' | 'year';

/**
 * Journal des doublons tontine : plusieurs téléphones utilisent parfois le même compte
 * commercial sans être synchronisés. Le serveur trace chaque seconde saisie pour un membre.
 */
@Component({
  selector: 'app-tontine-delivery-conflicts',
  templateUrl: './tontine-delivery-conflicts.component.html',
  styleUrls: ['./tontine-delivery-conflicts.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class TontineDeliveryConflictsComponent implements OnInit, OnDestroy {
  private dateIntervalId?: ReturnType<typeof setInterval>;

  conflicts: TontineDeliveryConflict[] = [];
  isLoading = true;
  currentPage = 0;
  pageSize = 10;
  totalElement = 0;

  selectedCommercial: string | null = null;
  outcome: TontineDeliveryConflictOutcome | null = null;
  activePeriod: ConflictPeriod = 'month';
  dateFrom = '';
  dateTo = '';

  currentDate = new Date();
  lastUpdate = new Date();

  readonly operationLabels = CONFLICT_OPERATION_LABELS;
  readonly reasonLabels = CONFLICT_REASON_LABELS;

  constructor(
    private readonly deliveryService: TontineDeliveryService,
    private readonly alertService: AlertService,
    private readonly router: Router,
    private readonly tokenStorage: TokenStorageService
  ) {
    this.tokenStorage.checkConnectedUser();
  }

  ngOnInit(): void {
    this.selectPeriod(this.activePeriod);
    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  get rejectedOnPage(): number {
    return this.conflicts.filter(conflict => conflict.outcome === 'REJECTED').length;
  }

  get mergedOnPage(): number {
    return this.conflicts.filter(conflict => conflict.outcome === 'MERGED').length;
  }

  get rejectedAmountOnPage(): number {
    return this.conflicts
      .filter(conflict => conflict.outcome === 'REJECTED')
      .reduce((sum, conflict) => sum + (conflict.incomingAmount || 0), 0);
  }

  selectPeriod(period: ConflictPeriod): void {
    this.activePeriod = period;
    const now = new Date();
    const start = new Date(now);
    if (period === 'week') {
      start.setDate(now.getDate() - 6);
    } else if (period === 'month') {
      start.setDate(1);
    } else if (period === 'year') {
      start.setMonth(0, 1);
    }
    this.dateFrom = this.toIsoDate(start);
    this.dateTo = this.toIsoDate(now);
    this.currentPage = 0;
    this.loadData();
  }

  onCommercialSelected(commercial: string | null): void {
    this.selectedCommercial = commercial || null;
    this.currentPage = 0;
    this.loadData();
  }

  onOutcomeChange(outcome: TontineDeliveryConflictOutcome | null): void {
    this.outcome = outcome;
    this.currentPage = 0;
    this.loadData();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData();
  }

  refresh(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.deliveryService.getConflicts(
      this.dateFrom,
      this.dateTo,
      this.selectedCommercial,
      this.outcome,
      this.currentPage,
      this.pageSize
    ).subscribe({
      next: (res) => {
        if (res.statusCode === 200 && res.data) {
          this.conflicts = [...res.data.content];
          this.totalElement = res.data.page?.totalElements ?? res.data.totalElements ?? 0;
          this.lastUpdate = new Date();
        } else {
          this.conflicts = [];
          this.totalElement = 0;
          this.alertService.showError(res.message || 'Une erreur est survenue');
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.conflicts = [];
        this.alertService.showError('Erreur de communication avec le serveur');
        console.error(err);
      }
    });
  }

  viewMember(conflict: TontineDeliveryConflict): void {
    void this.router.navigate(['/tontine/member', conflict.tontineMemberId]);
  }

  itemLines(conflict: TontineDeliveryConflict): string[] {
    return (conflict.incomingItems || '').split('\n').filter(line => line.trim().length > 0);
  }

  private toIsoDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
