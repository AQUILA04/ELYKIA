import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DebtService } from '../../services/debt.service';
import { DebtDocument } from '../../models/debt.model';
import { AlertService } from 'src/app/shared/service/alert.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-debt-detail',
  templateUrl: './debt-detail.component.html',
  styleUrls: ['./debt-detail.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DebtDetailComponent implements OnInit, OnDestroy {
  debt: DebtDocument | null = null;
  currentDate = new Date();
  private clock?: ReturnType<typeof setInterval>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private debtService: DebtService,
    private alertService: AlertService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.clock = setInterval(() => (this.currentDate = new Date()), 1000);
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/debts']);
      return;
    }
    this.load(id);
  }

  ngOnDestroy(): void {
    if (this.clock) {
      clearInterval(this.clock);
    }
  }

  load(id: number): void {
    this.spinner.show();
    this.debtService.getById(id).subscribe({
      next: (debt) => {
        this.debt = debt;
        this.spinner.hide();
      },
      error: () => {
        this.spinner.hide();
        this.alertService.showError('Dette introuvable.');
        this.router.navigate(['/debts']);
      }
    });
  }

  recalculate(): void {
    if (!this.debt) return;
    this.spinner.show();
    this.debtService.recalculate(this.debt.id).subscribe({
      next: (debt) => {
        this.debt = debt;
        this.spinner.hide();
        this.alertService.showSuccess('Dette recalculée.');
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError(err?.error?.message || 'Recalcul impossible.');
      }
    });
  }

  cancelDebt(): void {
    if (!this.debt) return;
    const reason = prompt('Motif d\'annulation (optionnel) :') || undefined;
    this.spinner.show();
    this.debtService.cancel(this.debt.id, reason).subscribe({
      next: (debt) => {
        this.debt = debt;
        this.spinner.hide();
        this.alertService.showSuccess('Dette annulée.');
      },
      error: (err) => {
        this.spinner.hide();
        this.alertService.showError(err?.error?.message || 'Annulation impossible.');
      }
    });
  }

  back(): void {
    this.router.navigate(['/debts']);
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      MERCHANDISE: 'Marchandise',
      CASH_SHORTAGE: 'Manquant caisse',
      CASH_SURPLUS: 'Surplus caisse',
      INVENTORY_SHORTAGE: 'Écart inventaire'
    };
    return labels[type] || type;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      OPEN: 'Ouverte',
      PARTIALLY_SETTLED: 'Partiellement réglée',
      SETTLED: 'Réglée',
      CANCELLED: 'Annulée'
    };
    return labels[status] || status;
  }

  statusClass(status: string): string {
    switch (status) {
      case 'OPEN': return 'status-open';
      case 'PARTIALLY_SETTLED': return 'status-partial';
      case 'SETTLED': return 'status-settled';
      default: return 'status-cancelled';
    }
  }

  periodLabel(debt: DebtDocument): string {
    if (debt.periodGrain === 'DAY') {
      return debt.periodDay || '';
    }
    return `${debt.periodMonth}/${debt.periodYear}`;
  }

  settlementLabel(mode: string): string {
    const labels: Record<string, string> = {
      CASH: 'Espèces',
      SURPLUS_OFFSET: 'Avoir',
      WRITE_OFF: 'Abandon'
    };
    return labels[mode] || mode;
  }
}
