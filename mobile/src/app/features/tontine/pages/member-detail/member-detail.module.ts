import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { MemberDetailPage } from './member-detail.page';
import { IfUnitPriceDirective } from 'src/app/shared/directives/if-unit-price.directive';
import { ClientAvatarComponent } from 'src/app/shared/components/client-avatar/client-avatar.component';
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
        IonicModule,
        RouterModule.forChild(routes),
        IfUnitPriceDirective,
        ClientAvatarComponent,
        TontineOrderReceiptModalModule,
        TontineDeliverRecapModalModule,
        TontineDeliveryReceiptModalModule
    ],
    declarations: [MemberDetailPage]
})
export class MemberDetailPageModule { }
