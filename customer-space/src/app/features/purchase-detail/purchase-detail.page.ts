import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerPurchase } from '../../shared/models/customer.model';
/** Page Détail Achat — S-05. @author Francis AHONSU */
@Component({ selector: 'app-purchase-detail', standalone: true, imports: [CommonModule, IonicModule, RouterModule], template: `
<ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><ion-back-button defaultHref="/purchases"></ion-back-button></ion-buttons><ion-title>Détail de l'achat</ion-title></ion-toolbar></ion-header>
<ion-content class="page-content" *ngIf="purchase">
  <div class="page-inner">
    <div class="detail-card">
      <div class="dc-header"><span class="dc-ref">{{ purchase.reference }}</span><span class="dc-status">{{ purchase.status }}</span></div>
      <div class="dc-amount">{{ purchase.totalAmount | number:'1.0-0' }} FCFA</div>
    </div>
    <h3 class="section-title">Articles</h3>
    <div class="article-card" *ngFor="let item of purchase.items">
      <div class="art-name">{{ item.articleName }}</div>
      <div class="art-meta">{{ item.quantity }} × {{ item.unitPrice | number:'1.0-0' }} = {{ item.totalPrice | number:'1.0-0' }} FCFA</div>
    </div>
    <ion-button expand="block" [routerLink]="['/purchases', purchase.id, 'timeline']" style="margin-top:16px">Voir le suivi des mises</ion-button>
  </div>
</ion-content>`, styles: [`.page-content{--background:#FAF6EE}.page-inner{padding:16px}ion-toolbar{--background:#fff;--color:#0D1B2A}.detail-card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(13,27,42,.08);margin-bottom:16px}.dc-header{display:flex;justify-content:space-between;margin-bottom:8px}.dc-ref{font-weight:700;color:#0D1B2A}.dc-status{font-size:11px;font-weight:700;color:#F97316}.dc-amount{font-size:24px;font-weight:700;color:#0D1B2A;font-family:'Playfair Display',serif}.section-title{font-size:15px;font-weight:700;color:#0D1B2A;margin:16px 0 10px}.article-card{background:#fff;border-radius:12px;padding:12px 14px;box-shadow:0 1px 6px rgba(13,27,42,.05);margin-bottom:8px}.art-name{font-size:13px;font-weight:600;color:#0D1B2A}.art-meta{font-size:12px;color:#64748B;margin-top:2px}ion-button{--border-radius:12px;--background:#C9922A;font-weight:600}`] })
export class PurchaseDetailPage implements OnInit {
  purchase: CustomerPurchase | null = null;
  constructor(private route: ActivatedRoute, private api: CustomerApiService) {}
  ngOnInit(): void { const id = this.route.snapshot.params['id']; this.api.getPurchaseById(id).subscribe(p => this.purchase = p); }
}
