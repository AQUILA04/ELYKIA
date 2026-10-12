import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DebtService } from '../../services/debt.service';
import { DebtDocument, DebtStatus, DebtSummary, DebtType } from '../../models/debt.model';
import { AlertService } from 'src/app/shared/service/alert.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-debt-list',
  templateUrl: './debt-list.component.html',
  styleUrls: ['./debt-list.component.scss']
})
export class DebtListComponent implements OnInit {
  debts: DebtDocument[] = [];
  totalElements = 0;
  pageIndex = 0;
  pageSize = 20;
  summary: DebtSummary | null = null;

  filterHolder = '';
  filterType: DebtType | '' = '';
  filterStatus: DebtStatus | '' = '';
  filterYear: number | null = null;
  filterMonth: number | null = null;

  selectedIds = new Set<number>();
  settleMode: 'CASH' | 'SURPLUS_OFFSET' | 'WRITE_OFF' = 'CASH';
  settleAmount: number | null = null;
  settleNote = '';
  showSettleModal = false;

  readonly typeLabels: Record<string, string> = {
    MERCHANDISE: 'Marchandise',
    CASH_SHORTAGE: 'Manquant caisse',
    CASH_SURPLUS: 'Surplus caisse',
    INVENTORY_SHORTAGE: 'Écart inventaire'
  };

  readonly statusLabels: Record<string, string> = {
    OPEN: 'Ouverte',
    PARTIALLY_SETTLED: 'Partiellement réglée',
    SETTLED: 'Réglée',
    CANCELLED: 'Annulée'
  };

  constructor(
    private debtService: DebtService,
    private router: Router,
    private alertService: AlertService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.loadSummary();
    this.load();
  }

  loadSummary(): void {
    this.debtService.summary().subscribe({
      next: (s) => (this.summary = s),
      error: () => (this.summary = null)
    });
  }

  load(): void {
    this.spinner.show();
    this.debtService.search({
      holder: this.filterHolder || undefined,
      type: (this.filterType || undefined) as DebtType | undefined,
      status: (this.filterStatus || undefined) as DebtStatus | undefined,
      year: this.filterYear ?? undefined,
      month: this.filterMonth ?? undefined,
      page: this.pageIndex,
      size: this.pageSize
    }).subscribe({
      next: (page) => {
        this.debts = page.content || [];
        this.totalElements = page.totalElements || 0;
        this.spinner.hide();
      },
      error: () => {
        this.spinner.hide();
        this.alertService.showError('Impossible de charger les dettes.');
      }
    });
  }

  onPage(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  openDetail(debt: DebtDocument): void {
    this.router.navigate(['/debts', debt.id]);
  }

  toggleSelect(debt: DebtDocument): void {
    if (debt.debtType === 'CASH_SURPLUS' || debt.status === 'SETTLED' || debt.status === 'CANCELLED') {
      return;
    }
    if (this.selectedIds.has(debt.id)) {
      this.selectedIds.delete(debt.id);
    } else {
      this.selectedIds.add(debt.id);
    }
  }

  openSettleModal(): void {
    if (this.selectedIds.size === 0) {
      this.alertService.showError('Sélectionnez au moins une dette ouverte.');
      return;
    }
    this.settleAmount = this.selectedRemainingTotal();
    this.settleNote = '';
    this.settleMode = 'CASH';
    this.showSettleModal = true;
  }

  selectedRemainingTotal(): number {
    return this.debts
      .filter((d) => this.selectedIds.has(d.id))
      .reduce((acc, d) => acc + (d.remainingAmount || 0), 0);
  }

  confirmSettle(): void {
    this.spinner.show();
    this.debtService.settle({
      debtIds: Array.from(this.selectedIds),
      settlementMode: this.settleMode,
      amount: this.settleAmount ?? undefined,
      note: this.settleNote || undefined
    }).subscribe({
      next: () => {
        this.spinner.hide();
        this.showSettleModal = false;
        this.selectedIds.clear();
        this.alertService.showSuccess('Règlement enregistré.');
        this.loadSummary();
        this.load();
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError(err?.error?.message || 'Échec du règlement.');
      }
    });
  }

  typeLabel(type: string): string {
    return this.typeLabels[type] || type;
  }

  statusLabel(status: string): string {
    return this.statusLabels[status] || status;
  }
}
