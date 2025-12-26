import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { NewDistributionPageRoutingModule } from './new-distribution-routing.module';
import { NewDistributionPage } from './new-distribution.page';

// Import shared components
import { ClientSelectorModalComponent } from '../../../../shared/components/client-selector-modal/client-selector-modal.component';
import { DistributionConfirmationModalComponent } from '../../../../shared/components/distribution-confirmation-modal/distribution-confirmation-modal.component';

import { PrintReceiptModalModule } from '../../../../shared/components/print-receipt-modal/print-receipt-modal.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    NewDistributionPageRoutingModule,
    PrintReceiptModalModule,
    ScrollingModule
  ],
  declarations: [
    NewDistributionPage,
    ClientSelectorModalComponent,
    DistributionConfirmationModalComponent
  ]
})
export class NewDistributionPageModule {}

