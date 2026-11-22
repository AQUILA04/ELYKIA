import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BiDashboardComponent } from './pages/bi-dashboard/bi-dashboard.component';
import { BiSalesDashboardComponent } from './pages/bi-sales-dashboard/bi-sales-dashboard.component';
import { BiCollectionsDashboardComponent } from './pages/bi-collections-dashboard/bi-collections-dashboard.component';
import { BiStockDashboardComponent } from './pages/bi-stock-dashboard/bi-stock-dashboard.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: BiDashboardComponent,
    data: { title: 'Dashboard BI' }
  },
  {
    path: 'sales',
    component: BiSalesDashboardComponent,
    data: { title: 'Analyse des Ventes' }
  },
  {
    path: 'collections',
    component: BiCollectionsDashboardComponent,
    data: { title: 'Analyse des Recouvrements' }
  },
  {
    path: 'stock',
    component: BiStockDashboardComponent,
    data: { title: 'Analyse du Stock' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BiRoutingModule { }
