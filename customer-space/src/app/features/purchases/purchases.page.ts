import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerPurchase, OrderStatus } from '../../shared/models/customer.model';
import { CustomerTabBarComponent } from '../../shared/layout/customer-tab-bar/customer-tab-bar.component';
import { ElykPageHeaderComponent } from '../../shared/ui';

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
    { value: 'LIVRE', label: 'Livrés' },
    { value: 'VALIDE', label: 'Validés' },
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

  statusChipClass(s: string): string {
    if (s === 'VALIDE' || s === 'LIVRE') return 'elyk-chip--success';
    if (s === 'RETARD') return 'elyk-chip--neutral';
    return 'elyk-chip--gold';
  }

  progressPercent(p: CustomerPurchase): number {
    return p.totalAmount > 0 ? (p.paidAmount / p.totalAmount) * 100 : 0;
  }

  private applyFilter(): void {
    this.filtered = this.statusFilter === 'ALL'
      ? this.purchases
      : this.purchases.filter((p) => p.status === this.statusFilter);
  }
}
