import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StockTontineRequestListComponent } from './pages/stock-tontine-request-list/stock-tontine-request-list.component';
import { StockTontineRequestCreateComponent } from './pages/stock-tontine-request-create/stock-tontine-request-create.component';
import { StockTontineReturnListComponent } from './pages/stock-tontine-return-list/stock-tontine-return-list.component';
import { StockTontineReturnCreateComponent } from './pages/stock-tontine-return-create/stock-tontine-return-create.component';
import { MyTontineStockDashboardComponent } from './pages/my-tontine-stock-dashboard/my-tontine-stock-dashboard.component';

const routes: Routes = [
  {
    path: 'request',
    component: StockTontineRequestListComponent
  },
  {
    path: 'request/create',
    component: StockTontineRequestCreateComponent
  },
  {
    path: 'return',
    component: StockTontineReturnListComponent
  },
  {
    path: 'return/create',
    component: StockTontineReturnCreateComponent
  },
  {
    path: 'my-stock',
    component: MyTontineStockDashboardComponent
  },
  {
    path: '',
    redirectTo: 'my-stock',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StockTontineRoutingModule { }
