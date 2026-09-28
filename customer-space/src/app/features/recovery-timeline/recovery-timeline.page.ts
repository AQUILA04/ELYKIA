import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerPurchase, CustomerRecovery } from '../../shared/models/customer.model';
import { RecoveryPillsComponent } from '../../shared/components/recovery-pills/recovery-pills.component';
import { ElykPageHeaderComponent } from '../../shared/ui';

/** Page Timeline Recouvrements — Type C. */
@Component({
  selector: 'app-recovery-timeline',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, RecoveryPillsComponent, ElykPageHeaderComponent],
  templateUrl: './recovery-timeline.page.html',
  styleUrls: ['./recovery-timeline.page.scss'],
})
export class RecoveryTimelinePage implements OnInit {
  distributionId = '';
  recoveries: CustomerRecovery[] = [];
  purchase: CustomerPurchase | null = null;
  totalInstallments = 12;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private api: CustomerApiService,
    private router: Router,
  ) {}

  get nextRecovery(): CustomerRecovery | undefined {
    return this.recoveries.find((r) => r.status === 'INITIE' || r.status === 'RETARD');
  }

  get canPay(): boolean {
    if (this.nextRecovery) return true;
    return !!this.purchase
      && this.purchase.remainingAmount > 0
      && this.purchase.dailyPayment > 0;
  }

  ngOnInit(): void {
    this.distributionId = this.route.snapshot.params['id'];
    forkJoin({
      recoveries: this.api.getRecoveries(this.distributionId),
      purchase: this.api.getPurchaseById(this.distributionId).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ recoveries, purchase }) => {
        this.recoveries = recoveries;
        this.purchase = purchase;
        this.totalInstallments = purchase?.installmentCount || recoveries.length || 12;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  paymentQueryParams(): Record<string, string | number> {
    const next = this.nextRecovery;
    if (next) {
      return {
        amount: next.amount ?? 0,
        installment: next.installmentNumber ?? 0,
      };
    }
    const paid = this.purchase?.paidInstallmentCount
      ?? this.recoveries.filter((r) => r.status === 'VALIDE').length;
    return {
      amount: this.purchase?.dailyPayment ?? 0,
      installment: Math.max(1, paid + 1),
    };
  }

  goBack(): void {
    void this.router.navigate(['/purchases', this.distributionId]);
  }
}
