import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StockRequestListComponent } from './pages/stock-request-list/stock-request-list.component';
import { StockRequestCreateComponent } from './pages/stock-request-create/stock-request-create.component';
import { MyStockDashboardComponent } from './pages/my-stock-dashboard/my-stock-dashboard.component';
import { StockReturnListComponent } from './pages/stock-return-list/stock-return-list.component';
import { StockReturnCreateComponent } from './pages/stock-return-create/stock-return-create.component';

const routes: Routes = [
  {
    path: 'request',
    component: StockRequestListComponent
  },
  {
    path: 'request/create',
    component: StockRequestCreateComponent
  },
  {
    path: 'my-stock',
    component: MyStockDashboardComponent
  },
  {
    path: 'return',
    component: StockReturnListComponent
  },
  {
    path: 'return/create',
    component: StockReturnCreateComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StockRoutingModule { }
