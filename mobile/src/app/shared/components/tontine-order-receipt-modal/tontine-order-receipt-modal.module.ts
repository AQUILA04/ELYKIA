import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TontineOrderReceiptModalComponent } from './tontine-order-receipt-modal.component';
import { IfUnitPriceDirective } from '../../directives/if-unit-price.directive';
import { IfNoUnitPriceDirective } from '../../directives/if-no-unit-price.directive';

@NgModule({
  declarations: [TontineOrderReceiptModalComponent],
  imports: [
    CommonModule,
    IonicModule,
    IfUnitPriceDirective,
    IfNoUnitPriceDirective
  ],
  exports: [TontineOrderReceiptModalComponent]
})
export class TontineOrderReceiptModalModule { }
