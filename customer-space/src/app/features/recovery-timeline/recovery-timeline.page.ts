import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CustomerApiService } from '../../shared/services/customer-api.service';
import { CustomerRecovery } from '../../shared/models/customer.model';
import { RecoveryPillsComponent } from '../../shared/components/recovery-pills/recovery-pills.component';
/** Page Timeline Recouvrements — S-06. @author Francis AHONSU */
@Component({ selector: 'app-recovery-timeline', standalone: true, imports: [CommonModule, IonicModule, RouterModule, RecoveryPillsComponent], template: `
<ion-header class="ion-no-border"><ion-toolbar><ion-buttons slot="start"><ion-back-button></ion-back-button></ion-buttons><ion-title>Suivi des mises</ion-title></ion-toolbar></ion-header>
<ion-content class="page-content">
  <div class="page-inner">
    <app-recovery-pills [totalInstallments]="totalInstallments" [recoveries]="recoveries"></app-recovery-pills>
    <h3 class="section-title">Détail des mises</h3>
    <div class="timeline-item" *ngFor="let r of recoveries">
      <div class="ti-dot" [class.ti-dot--valide]="r.status==='VALIDE'" [class.ti-dot--initie]="r.status==='INITIE'" [class.ti-dot--retard]="r.status==='RETARD'"></div>
      <div class="ti-content">
        <span class="ti-label">Mise #{{ r.installmentNumber }}</span>
        <span class="ti-date">{{ r.paymentDate | date:'dd/MM/yyyy' }}</span>
      </div>
      <span class="ti-amount">{{ r.amount | number:'1.0-0' }} FCFA</span>
      <span class="ti-status">{{ r.status }}</span>
    </div>
  </div>
</ion-content>
<ion-footer><ion-toolbar><ion-button expand="block" [routerLink]="['/payment', distributionId]">Payer la prochaine mise</ion-button></ion-toolbar></ion-footer>`,
styles: [`.page-content{--background:#FAF6EE}.page-inner{padding:16px}ion-toolbar{--background:#fff;--color:#0D1B2A}.section-title{font-size:15px;font-weight:700;color:#0D1B2A;margin:16px 0 10px}.timeline-item{display:flex;align-items:center;gap:10px;background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 6px rgba(13,27,42,.05)}.ti-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0;background:#D1D5DB}.ti-dot--valide{background:#22C55E}.ti-dot--initie{background:#F97316}.ti-dot--retard{background:#EF4444}.ti-content{flex:1;display:flex;flex-direction:column}.ti-label{font-size:13px;font-weight:600;color:#0D1B2A}.ti-date{font-size:11px;color:#94A3B8}.ti-amount{font-size:13px;font-weight:700;color:#0D1B2A}.ti-status{font-size:10px;font-weight:700;color:#F97316;text-transform:uppercase}ion-button{--border-radius:12px;--background:#C9922A;font-weight:600}`] })
export class RecoveryTimelinePage implements OnInit {
  distributionId = '';
  recoveries: CustomerRecovery[] = [];
  totalInstallments = 12;
  constructor(private route: ActivatedRoute, private api: CustomerApiService) {}
  ngOnInit(): void { this.distributionId = this.route.snapshot.params['id']; this.api.getRecoveries(this.distributionId).subscribe(r => { this.recoveries = r; this.totalInstallments = r.length || 12; }); }
}
