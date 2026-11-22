import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { MemberDetailPage } from './member-detail.page';
import { IfUnitPriceDirective } from 'src/app/shared/directives/if-unit-price.directive';
import { TontineOrderReceiptModalModule } from 'src/app/shared/components/tontine-order-receipt-modal/tontine-order-receipt-modal.module';
import { TontineDeliverRecapModalModule } from 'src/app/shared/components/tontine-deliver-recap-modal/tontine-deliver-recap-modal.module';
import { TontineDeliveryReceiptModalModule } from 'src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.module';

const routes: Routes = [
    {
        path: '',
        component: MemberDetailPage
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonIcon, IonSpinner, IonTitle, IonToolbar,
        RouterModule.forChild(routes),
        IfUnitPriceDirective,
        TontineOrderReceiptModalModule,
        TontineDeliverRecapModalModule,
        TontineDeliveryReceiptModalModule
    ],
    declarations: [MemberDetailPage]
})
export class MemberDetailPageModule { }
