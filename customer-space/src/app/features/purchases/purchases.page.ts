import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerPurchase, OrderStatus } from '../../shared/models/customer.model';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';
import { ElykPageHeaderComponent } from '../../shared/ui';
import { creditStatusChipClass, creditStatusLabel } from '../../shared/utils/credit-status-label';

type StatusFilter = 'ALL' | OrderStatus;

/** Page Historique Achats — Type C. */
@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, CustomerTabBarComponent, ElykPageHeaderComponent],
  templateUrl: './purchases.page.html',
  styleUrls: ['./purchases.page.scss'],
})
export class PurchasesPage implements OnInit {
  purchases: CustomerPurchase[] = [];
  filtered: CustomerPurchase[] = [];
  isLoading = true;
  statusFilter: StatusFilter = 'ALL';

  readonly filters: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'INPROGRESS', label: 'En cours' },
    { value: 'LIVRE', label: 'Terminés' },
    { value: 'INITIE', label: 'Initiés' },
  ];

  constructor(private api: CustomerApiService) {}

  ngOnInit(): void {
    this.api.getPurchases().subscribe({
      next: (d) => {
        this.purchases = d;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; },
    });
  }

  setFilter(value: StatusFilter): void {
    this.statusFilter = value;
    this.applyFilter();
  }

  statusLabel(s: string): string {
    return creditStatusLabel(s);
  }

  statusChipClass(s: string): string {
    return creditStatusChipClass(s);
  }

  progressPercent(p: CustomerPurchase): number {
    return p.totalAmount > 0 ? (p.paidAmount / p.totalAmount) * 100 : 0;
  }

  progressLabel(p: CustomerPurchase): string {
    const pct = Math.round(this.progressPercent(p));
    return `${pct}% remboursé · Restant ${p.remainingAmount.toLocaleString('fr-FR')} F`;
  }

  private applyFilter(): void {
    this.filtered = this.statusFilter === 'ALL'
      ? this.purchases
      : this.purchases.filter((p) => p.status === this.statusFilter);
  }
}
