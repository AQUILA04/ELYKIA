import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { OrderEditPage } from './order-edit.page';
import { IfUnitPriceDirective } from 'src/app/shared/directives/if-unit-price.directive';

const routes: Routes = [{ path: '', component: OrderEditPage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes), IfUnitPriceDirective],
  declarations: [OrderEditPage]
})
export class OrderEditPageModule { }
