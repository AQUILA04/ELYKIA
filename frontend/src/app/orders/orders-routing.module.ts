import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrderDashboardComponent } from './pages/order-dashboard/order-dashboard.component';
import { OrderDetailsComponent } from './pages/order-details/order-details.component';
import { OrderFormComponent } from './pages/order-form/order-form.component';

const routes: Routes = [
  {
    path: '',
    component: OrderDashboardComponent,
    data: { breadcrumb: 'Tableau de bord' }
  },
  {
    path: 'dashboard',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'create',
    component: OrderFormComponent,
    data: { breadcrumb: 'Créer une commande' }
  },
  {
    path: 'edit/:id',
    component: OrderFormComponent,
    data: { breadcrumb: 'Modifier la commande' }
  },
  {
    path: 'details/:id',
    component: OrderDetailsComponent,
    data: { breadcrumb: 'Détails de la commande' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrdersRoutingModule { }