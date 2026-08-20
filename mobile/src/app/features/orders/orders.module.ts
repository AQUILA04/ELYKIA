import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { OrdersRoutingModule } from './orders-routing.module';
import { SharedModule } from '../../shared/shared.module';

import { NewOrderPage } from './pages/new-order/new-order.page';
import { EditOrderPage } from './pages/edit-order/edit-order.page';
import { OrderListPage } from './pages/order-list/order-list.page';
import { OrderDetailPage } from './pages/order-detail/order-detail.page';
import { OrderItemComponent } from './components/order-item/order-item.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    OrdersRoutingModule,
    SharedModule
  ],
  declarations: [
    NewOrderPage,
    EditOrderPage,
    OrderListPage,
    OrderDetailPage,
    OrderItemComponent
  ]
})
export class OrdersModule { }
