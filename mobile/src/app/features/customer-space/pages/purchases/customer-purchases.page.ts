import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { CustomerApiService } from '../../services/customer-api.service';
import { CustomerPurchase } from '../../models/customer-dashboard.model';

/**
 * Page Historique des Achats — S-04.
 * Liste filtrée des achats à crédit du client.
 *
 * @author Francis AHONSU
 */
@Component({
  selector: 'app-customer-purchases',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/customer/dashboard"></ion-back-button></ion-buttons>
        <ion-title>Mes Achats</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list *ngIf="!isLoading">
        <ion-item *ngFor="let purchase of purchases" [routerLink]="['/customer/purchases', purchase.id]" detail>
          <ion-label>
            <h2>{{ purchase.reference }}</h2>
            <p>{{ purchase.totalAmount | number:'1.0-0' }} FCFA · {{ purchase.status }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-spinner *ngIf="isLoading"></ion-spinner>
    </ion-content>
  `,
})
export class CustomerPurchasesPage implements OnInit {
  purchases: CustomerPurchase[] = [];
  isLoading = true;
  constructor(private apiService: CustomerApiService) {}
  ngOnInit(): void {
    this.apiService.getPurchases().subscribe({ next: (d) => { this.purchases = d; this.isLoading = false; }, error: () => { this.isLoading = false; } });
  }
}
