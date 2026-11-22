import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StockRequestListComponent } from './pages/stock-request-list/stock-request-list.component';
import { StockRequestCreateComponent } from './pages/stock-request-create/stock-request-create.component';
import { MyStockDashboardComponent } from './pages/my-stock-dashboard/my-stock-dashboard.component';
import { StockTeamComponent } from './pages/stock-team/stock-team.component';
import { StockSheetComponent } from './pages/stock-sheet/stock-sheet.component';
import { StockRegularisationComponent } from './pages/stock-regularisation/stock-regularisation.component';
import { StockReturnListComponent } from './pages/stock-return-list/stock-return-list.component';
import { StockReturnCreateComponent } from './pages/stock-return-create/stock-return-create.component';
import { StockReceptionListComponent } from './pages/stock-reception-list/stock-reception-list.component';
import { StockReceptionDetailComponent } from './pages/stock-reception-detail/stock-reception-detail.component';
import { RattrapageCreditAddComponent } from './rattrapage/rattrapage-credit-add.component';
import { StockReturnHistoriqueComponent } from './stock-return-historique/stock-return-historique.component';

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
    path: 'request/edit/:id',
    component: StockRequestCreateComponent
  },
  // Nouveau stock commercial (ouvert par le menu). L'ancienne présentation reste sur /classic.
  {
    path: 'my-stock',
    component: StockTeamComponent
  },
  {
    path: 'my-stock/classic',
    component: MyStockDashboardComponent
  },
  {
    path: 'my-stock/:collector/:year/:month',
    component: StockSheetComponent
  },
  {
    path: 'my-stock/:collector/:year/:month/regularisation',
    component: StockRegularisationComponent,
    data: { title: 'Régularisation du stock' }
  },
  {
    path: 'return',
    component: StockReturnListComponent
  },
  {
    path: 'return/create',
    component: StockReturnCreateComponent
  },
  {
    path: 'receptions',
    component: StockReceptionListComponent
  },
  {
    path: 'receptions/:id',
    component: StockReceptionDetailComponent
  },
  {
    path: 'credit/rattrapage',
    component: RattrapageCreditAddComponent,
    data: { title: 'Distribution de rattrapage' }
  },
  {
    path: 'return/historique',
    component: StockReturnHistoriqueComponent,
    data: { title: 'Retour en stock historique' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StockRoutingModule { }
