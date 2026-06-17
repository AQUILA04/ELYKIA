import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerPurchase } from '../../shared/models/customer.model';
/** Page Historique Achats — S-04. @author Francis AHONSU */
@Component({ selector: 'app-purchases', standalone: true, imports: [CommonModule, IonicModule, RouterModule], templateUrl: './purchases.page.html', styleUrls: ['./purchases.page.scss'] })
export class PurchasesPage implements OnInit {
  purchases: CustomerPurchase[] = [];
  isLoading = true;
  constructor(private api: CustomerApiService) {}
  ngOnInit(): void { this.api.getPurchases().subscribe({ next: d => { this.purchases = d; this.isLoading = false; }, error: () => this.isLoading = false }); }
  statusColor(s: string): string { return s === 'VALIDE' ? '#22C55E' : s === 'LIVRE' ? '#60A5FA' : s === 'RETARD' ? '#EF4444' : '#F97316'; }
}
