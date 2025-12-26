import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NewOrderPage } from './pages/new-order/new-order.page';
import { EditOrderPage } from './pages/edit-order/edit-order.page';
import { OrderListPage } from './pages/order-list/order-list.page';

const routes: Routes = [
  {
    path: '',
    component: OrderListPage
  },
  {
    path: 'new',
    component: NewOrderPage
  },
  {
    path: 'edit/:id',
    component: EditOrderPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrdersRoutingModule { }