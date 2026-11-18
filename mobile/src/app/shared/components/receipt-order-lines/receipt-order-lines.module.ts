import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptOrderLinesComponent } from './receipt-order-lines.component';
import { IfUnitPriceDirective } from '../../directives/if-unit-price.directive';
import { IfNoUnitPriceDirective } from '../../directives/if-no-unit-price.directive';

@NgModule({
  declarations: [ReceiptOrderLinesComponent],
  imports: [
    CommonModule,
    IfUnitPriceDirective,
    IfNoUnitPriceDirective
  ],
  exports: [ReceiptOrderLinesComponent]
})
export class ReceiptOrderLinesModule { }
