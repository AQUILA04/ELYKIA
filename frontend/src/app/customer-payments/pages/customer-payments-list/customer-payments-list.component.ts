import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertService } from 'src/app/shared/service/alert.service';
import {
  CustomerMobileMoneySubmission,
  CustomerMobileMoneySubmissionService
} from '../../services/customer-mobile-money-submission.service';

@Component({
  selector: 'app-customer-payments-list',
  templateUrl: './customer-payments-list.component.html',
  styleUrls: ['./customer-payments-list.component.scss']
})
export class CustomerPaymentsListComponent implements OnInit {
  submissions: CustomerMobileMoneySubmission[] = [];
  loading = false;
  highlightId: number | null = null;

  constructor(
    private service: CustomerMobileMoneySubmissionService,
    private alertService: AlertService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.queryParamMap.get('id');
    this.highlightId = idParam ? Number(idParam) : null;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.list('INITIE').subscribe({
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
    this.service.validate(row.id).subscribe({
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
      this.service.reject(row.id).subscribe({
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

  openCredit(row: CustomerMobileMoneySubmission): void {
    void this.router.navigate(['/credit/details', row.creditId]);
  }
}
