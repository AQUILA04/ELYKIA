import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { DeliveryCreationPage } from './delivery-creation.page';
import { TontineDeliveryReceiptModalModule } from 'src/app/shared/components/tontine-delivery-receipt-modal/tontine-delivery-receipt-modal.module';
import { TontineOrderReceiptModalModule } from 'src/app/shared/components/tontine-order-receipt-modal/tontine-order-receipt-modal.module';
import { PlannedDateFieldComponent } from 'src/app/shared/components/planned-date-field/planned-date-field.component';
import { IfUnitPriceDirective } from 'src/app/shared/directives/if-unit-price.directive';

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
        TontineDeliveryReceiptModalModule,
        TontineOrderReceiptModalModule,
        IfUnitPriceDirective,
        PlannedDateFieldComponent
    ],
    declarations: [DeliveryCreationPage]
})
export class DeliveryCreationPageModule { }
