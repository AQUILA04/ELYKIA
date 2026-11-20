import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TontineDeliverRecapModalComponent } from './tontine-deliver-recap-modal.component';
import { IfUnitPriceDirective } from '../../directives/if-unit-price.directive';

@NgModule({
  declarations: [TontineDeliverRecapModalComponent],
  imports: [
    CommonModule,
    IonicModule,
    IfUnitPriceDirective
  ],
  exports: [TontineDeliverRecapModalComponent]
})
export class TontineDeliverRecapModalModule { }
