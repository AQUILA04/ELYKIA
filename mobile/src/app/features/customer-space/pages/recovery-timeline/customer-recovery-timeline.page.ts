import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CustomerApiService } from '../../services/customer-api.service';
import { CustomerRecovery } from '../../models/customer-dashboard.model';
import { RecoveryPillsComponent } from '../../components/recovery-pills/recovery-pills.component';
/** Page Timeline des Recouvrements — S-06. @author Francis AHONSU */
@Component({ selector: 'app-customer-recovery-timeline', standalone: true, imports: [CommonModule, IonicModule, RouterModule, RecoveryPillsComponent], template: `<ion-header><ion-toolbar color="primary"><ion-buttons slot="start"><ion-back-button></ion-back-button></ion-buttons><ion-title>Recouvrements</ion-title></ion-toolbar></ion-header><ion-content><app-recovery-pills [totalInstallments]="totalInstallments" [recoveries]="recoveries"></app-recovery-pills><p>TODO: Timeline verticale S-06</p></ion-content><ion-footer><ion-toolbar><ion-button expand="block" color="primary" [routerLink]="['/customer/payment', distributionId]">Payer la prochaine mise</ion-button></ion-toolbar></ion-footer>` })
export class CustomerRecoveryTimelinePage implements OnInit {
  distributionId = '';
  recoveries: CustomerRecovery[] = [];
  totalInstallments = 12;
  constructor(private route: ActivatedRoute, private apiService: CustomerApiService) {}
  ngOnInit(): void { this.distributionId = this.route.snapshot.params['id']; this.apiService.getRecoveries(this.distributionId).subscribe(r => this.recoveries = r); }
}
