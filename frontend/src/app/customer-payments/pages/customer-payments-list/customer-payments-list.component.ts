import { Component, OnInit } from '@angular/core';
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
  styleUrls: ['./customer-payments-list.component.scss']
})
export class CustomerPaymentsListComponent implements OnInit {
  tab: PaymentTab = 'credit';
  submissions: CustomerMobileMoneySubmission[] = [];
  tontineSubmissions: CustomerTontineMmSubmission[] = [];
  loading = false;
  highlightId: number | null = null;

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
    this.load();
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

  load(): void {
    this.loading = true;
    if (this.tab === 'tontine') {
      this.tontineService.list('INITIE').subscribe({
        next: (rows) => {
          this.tontineSubmissions = rows;
          this.loading = false;
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
      },
      error: () => {
        this.loading = false;
        this.alertService.toastError('Impossible de charger les déclarations.');
      }
    });
  }

  validate(row: CustomerMobileMoneySubmission): void {
    this.creditService.validate(row.id).subscribe({
      next: () => {
        this.alertService.toastSuccess('Déclaration validée.');
        this.load();
      },
      error: (err) => {
        this.alertService.toastError(err?.error?.message || 'Validation impossible.');
      }
    });
  }

  reject(row: CustomerMobileMoneySubmission): void {
    this.alertService.showConfirmation(
      'Rejeter la déclaration',
      'Confirmer le rejet de cette déclaration de paiement ?',
      'Rejeter',
      'Annuler'
    ).then((ok) => {
      if (!ok) {
        return;
      }
      this.creditService.reject(row.id).subscribe({
        next: () => {
          this.alertService.toastSuccess('Déclaration rejetée.');
          this.load();
        },
        error: (err) => {
          this.alertService.toastError(err?.error?.message || 'Rejet impossible.');
        }
      });
    });
  }

  validateTontine(row: CustomerTontineMmSubmission): void {
    this.tontineService.validate(row.id).subscribe({
      next: () => {
        this.alertService.toastSuccess('Cotisation tontine validée.');
        this.load();
      },
      error: (err) => {
        this.alertService.toastError(err?.error?.message || 'Validation impossible.');
      }
    });
  }

  rejectTontine(row: CustomerTontineMmSubmission): void {
    this.alertService.showConfirmation(
      'Rejeter la déclaration tontine',
      'Confirmer le rejet de cette cotisation ?',
      'Rejeter',
      'Annuler'
    ).then((ok) => {
      if (!ok) {
        return;
      }
      this.tontineService.reject(row.id).subscribe({
        next: () => {
          this.alertService.toastSuccess('Déclaration tontine rejetée.');
          this.load();
        },
        error: (err) => {
          this.alertService.toastError(err?.error?.message || 'Rejet impossible.');
        }
      });
    });
  }

  openCredit(row: CustomerMobileMoneySubmission): void {
    void this.router.navigate(['/credit/details', row.creditId]);
  }
}
