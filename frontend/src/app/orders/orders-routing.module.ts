import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrderDashboardComponent } from './pages/order-dashboard/order-dashboard.component';
import { OrderDetailsComponent } from './pages/order-details/order-details.component';
import { OrderFormComponent } from './pages/order-form/order-form.component';

const routes: Routes = [
  {
    path: '',
    component: OrderDashboardComponent
  },
  {
    path: 'dashboard',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'create',
    component: OrderFormComponent
  },
  {
    path: 'edit/:id',
    component: OrderFormComponent
  },
  {
    path: 'details/:id',
    component: OrderDetailsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrdersRoutingModule { }
