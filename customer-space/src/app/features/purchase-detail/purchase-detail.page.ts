import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerPurchase } from '../../shared/models/customer.model';

/** Page Détail Achat — S-05. */
@Component({
  selector: 'app-purchase-detail',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './purchase-detail.page.html',
  styleUrls: ['./purchase-detail.page.scss'],
})
export class PurchaseDetailPage implements OnInit {
  purchase: CustomerPurchase | null = null;
  isLoading = true;

  constructor(private route: ActivatedRoute, private api: CustomerApiService) {}

  get progressPercent(): number {
    if (!this.purchase || this.purchase.totalAmount <= 0) return 0;
    return (this.purchase.paidAmount / this.purchase.totalAmount) * 100;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.api.getPurchaseById(id).subscribe({
      next: (p) => { this.purchase = p; this.isLoading = false; },
      error: () => { this.isLoading = false; },
    });
  }
}
