import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerPurchase } from '../../shared/models/customer.model';
import { ElykPageHeaderComponent } from '../../shared/ui';
import { creditStatusChipClass, creditStatusLabel } from '../../shared/utils/credit-status-label';

/** Page Détail Achat — Type C. */
@Component({
  selector: 'app-purchase-detail',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, ElykPageHeaderComponent],
  templateUrl: './purchase-detail.page.html',
  styleUrls: ['./purchase-detail.page.scss'],
})
export class PurchaseDetailPage implements OnInit {
  purchase: CustomerPurchase | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private api: CustomerApiService,
    private router: Router,
  ) {}

  get progressPercent(): number {
    if (!this.purchase || this.purchase.totalAmount <= 0) return 0;
    return (this.purchase.paidAmount / this.purchase.totalAmount) * 100;
  }

  get statusLabel(): string {
    return creditStatusLabel(this.purchase?.status);
  }

  get statusChipClass(): string {
    return creditStatusChipClass(this.purchase?.status);
  }

  /** Solde restant + mise journalière connue → on peut déclarer une mise. */
  get canPay(): boolean {
    return !!this.purchase
      && this.purchase.remainingAmount > 0
      && this.purchase.dailyPayment > 0;
  }

  get paymentQueryParams(): Record<string, number> {
    if (!this.purchase) return {};
    return {
      amount: this.purchase.dailyPayment,
      installment: Math.max(1, (this.purchase.paidInstallmentCount || 0) + 1),
    };
  }

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.api.getPurchaseById(id).subscribe({
      next: (p) => { this.purchase = p; this.isLoading = false; },
      error: () => { this.isLoading = false; },
    });
  }

  goBack(): void {
    void this.router.navigate(['/purchases']);
  }
}
