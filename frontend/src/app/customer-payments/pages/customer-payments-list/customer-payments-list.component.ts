import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import {
  CustomerMobileMoneySubmission,
  CustomerMobileMoneySubmissionService
} from '../../services/customer-mobile-money-submission.service';
import {
  CustomerTontineMmSubmission,
  CustomerTontineMmSubmissionService
} from '../../services/customer-tontine-mm-submission.service';

type PaymentTab = 'credit' | 'tontine';

@Component({
  selector: 'app-customer-payments-list',
  templateUrl: './customer-payments-list.component.html',
  styleUrls: ['./customer-payments-list.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: false
})
export class CustomerPaymentsListComponent implements OnInit, OnDestroy {
  tab: PaymentTab = 'credit';
  submissions: CustomerMobileMoneySubmission[] = [];
  tontineSubmissions: CustomerTontineMmSubmission[] = [];
  loading = false;
  highlightId: number | null = null;
  /** Row keys currently being validated/rejected — reassigned for change detection. */
  busyRowKeys: Record<string, true> = {};

  currentDate = new Date();
  lastUpdate = new Date();
  private dateIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    private creditService: CustomerMobileMoneySubmissionService,
    private tontineService: CustomerTontineMmSubmissionService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    this.tab = tabParam === 'tontine' ? 'tontine' : 'credit';
    const idParam = this.route.snapshot.queryParamMap.get('id');
    this.highlightId = idParam ? Number(idParam) : null;

    this.dateIntervalId = setInterval(() => {
      this.currentDate = new Date();
    }, 1000);

    this.load();
  }

  ngOnDestroy(): void {
    if (this.dateIntervalId) {
      clearInterval(this.dateIntervalId);
    }
  }

  isRowBusy(kind: PaymentTab, id: number): boolean {
    return !!this.busyRowKeys[this.rowKey(kind, id)];
  }

  setTab(tab: PaymentTab): void {
    this.tab = tab;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab, id: this.highlightId || null },
      queryParamsHandling: 'merge'
    });
    this.load();
  }

  load(options?: { silent?: boolean }): void {
    const silent = !!options?.silent;
    if (!silent) {
      this.loading = true;
    }
    if (this.tab === 'tontine') {
      this.tontineService.list('INITIE').subscribe({
        next: (rows) => {
          this.tontineSubmissions = rows;
          this.loading = false;
          this.lastUpdate = new Date();
        },
        error: () => {
          this.loading = false;
          this.alertService.toastError('Impossible de charger les déclarations tontine.');
        }
      });
      return;
    }
    this.creditService.list('INITIE').subscribe({
      next: (rows) => {
        this.submissions = rows;
        this.loading = false;
        this.lastUpdate = new Date();
      },
      error: () => {
        this.loading = false;
        this.alertService.toastError('Impossible de charger les déclarations.');
      }
    });
  }

  validate(row: CustomerMobileMoneySubmission): void {
    if (!this.beginProcessing('credit', row.id)) {
      return;
    }
    this.creditService.validate(row.id).subscribe({
      next: () => {
        this.removeCreditRow(row.id);
        this.endProcessing('credit', row.id);
        this.alertService.toastSuccess('Déclaration validée.');
        this.load({ silent: true });
      },
      error: (err) => {
        this.endProcessing('credit', row.id);
        this.alertService.toastError(err?.error?.message || 'Validation impossible.');
      }
    });
  }

  reject(row: CustomerMobileMoneySubmission): void {
    if (this.isRowBusy('credit', row.id)) {
      return;
    }
    this.alertService.showConfirmation(
      'Rejeter la déclaration',
      'Confirmer le rejet de cette déclaration de paiement ?',
      'Rejeter',
      'Annuler'
    ).then((ok) => {
      if (!ok) {
        return;
      }
      if (!this.beginProcessing('credit', row.id)) {
        return;
      }
      this.creditService.reject(row.id).subscribe({
        next: () => {
          this.removeCreditRow(row.id);
          this.endProcessing('credit', row.id);
          this.alertService.toastSuccess('Déclaration rejetée.');
          this.load({ silent: true });
        },
        error: (err) => {
          this.endProcessing('credit', row.id);
          this.alertService.toastError(err?.error?.message || 'Rejet impossible.');
        }
      });
    });
  }

  validateTontine(row: CustomerTontineMmSubmission): void {
    if (!this.beginProcessing('tontine', row.id)) {
      return;
    }
    this.tontineService.validate(row.id).subscribe({
      next: () => {
        this.removeTontineRow(row.id);
        this.endProcessing('tontine', row.id);
        this.alertService.toastSuccess('Cotisation tontine validée.');
        this.load({ silent: true });
      },
      error: (err) => {
        this.endProcessing('tontine', row.id);
        this.alertService.toastError(err?.error?.message || 'Validation impossible.');
      }
    });
  }

  rejectTontine(row: CustomerTontineMmSubmission): void {
    if (this.isRowBusy('tontine', row.id)) {
      return;
    }
    this.alertService.showConfirmation(
      'Rejeter la déclaration tontine',
      'Confirmer le rejet de cette cotisation ?',
      'Rejeter',
      'Annuler'
    ).then((ok) => {
      if (!ok) {
        return;
      }
      if (!this.beginProcessing('tontine', row.id)) {
        return;
      }
      this.tontineService.reject(row.id).subscribe({
        next: () => {
          this.removeTontineRow(row.id);
          this.endProcessing('tontine', row.id);
          this.alertService.toastSuccess('Déclaration tontine rejetée.');
          this.load({ silent: true });
        },
        error: (err) => {
          this.endProcessing('tontine', row.id);
          this.alertService.toastError(err?.error?.message || 'Rejet impossible.');
        }
      });
    });
  }

  openCredit(row: CustomerMobileMoneySubmission): void {
    void this.router.navigate(['/credit/details', row.creditId]);
  }

  private rowKey(kind: PaymentTab, id: number): string {
    return `${kind}:${id}`;
  }

  private beginProcessing(kind: PaymentTab, id: number): boolean {
    const key = this.rowKey(kind, id);
    if (this.busyRowKeys[key]) {
      return false;
    }
    this.busyRowKeys = { ...this.busyRowKeys, [key]: true };
    return true;
  }

  private endProcessing(kind: PaymentTab, id: number): void {
    const key = this.rowKey(kind, id);
    if (!this.busyRowKeys[key]) {
      return;
    }
    const next = { ...this.busyRowKeys };
    delete next[key];
    this.busyRowKeys = next;
  }

  private removeCreditRow(id: number): void {
    this.submissions = this.submissions.filter((s) => s.id !== id);
    if (this.highlightId === id) {
      this.highlightId = null;
    }
  }

  private removeTontineRow(id: number): void {
    this.tontineSubmissions = this.tontineSubmissions.filter((s) => s.id !== id);
    if (this.highlightId === id) {
      this.highlightId = null;
    }
  }
}
