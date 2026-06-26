import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerRecovery } from '../../shared/models/customer.model';
import { RecoveryPillsComponent } from '../../shared/components/recovery-pills/recovery-pills.component';

/** Page Timeline Recouvrements — S-06. */
@Component({
  selector: 'app-recovery-timeline',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, RecoveryPillsComponent],
  templateUrl: './recovery-timeline.page.html',
  styleUrls: ['./recovery-timeline.page.scss'],
})
export class RecoveryTimelinePage implements OnInit {
  distributionId = '';
  recoveries: CustomerRecovery[] = [];
  totalInstallments = 12;
  isLoading = true;

  constructor(private route: ActivatedRoute, private api: CustomerApiService) {}

  get nextRecovery(): CustomerRecovery | undefined {
    return this.recoveries.find((r) => r.status === 'INITIE' || r.status === 'RETARD');
  }

  ngOnInit(): void {
    this.distributionId = this.route.snapshot.params['id'];
    this.api.getRecoveries(this.distributionId).subscribe({
      next: (r) => {
        this.recoveries = r;
        this.totalInstallments = r.length || 12;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  paymentQueryParams(): Record<string, string | number> {
    const next = this.nextRecovery;
    return {
      amount: next?.amount ?? 0,
      installment: next?.installmentNumber ?? 0,
    };
  }
}
