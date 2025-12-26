import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { DeliveryCreationPage } from './delivery-creation.page';
import { TontineDeliveryReceiptModalModule } from 'src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.module';

const routes: Routes = [
    {
        path: '',
        component: DeliveryCreationPage
    }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild(routes),
        TontineDeliveryReceiptModalModule
    ],
    declarations: [DeliveryCreationPage]
})
export class DeliveryCreationPageModule { }
