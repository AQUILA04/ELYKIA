import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StockDashboardComponent } from './dashboard/stock-dashboard.component';
import { StockOperationCreatePage } from './pages/stock-operation-create/stock-operation-create.page';
import { StockOperationDetailPage } from './pages/stock-operation-detail/stock-operation-detail.page';

const routes: Routes = [
  {
    path: '',
    component: StockDashboardComponent
  },
  {
    path: 'requests/new',
    component: StockOperationCreatePage,
    data: {
      kind: 'request',
      context: 'STANDARD',
      pageTitle: 'Nouvelle Sortie',
      submitLabel: 'Soumettre la demande'
    }
  },
  {
    path: 'requests/:id',
    component: StockOperationDetailPage,
    data: {
      kind: 'request',
      context: 'STANDARD',
      pageTitle: 'Détail de la demande',
      cancelLabel: 'Annuler la demande'
    }
  },
  {
    path: 'returns/new',
    component: StockOperationCreatePage,
    data: {
      kind: 'return',
      context: 'STANDARD',
      pageTitle: 'Nouveau Retour',
      submitLabel: 'Soumettre le retour',
      showComment: true
    }
  },
  {
    path: 'returns/:id',
    component: StockOperationDetailPage,
    data: {
      kind: 'return',
      context: 'STANDARD',
      pageTitle: 'Détail du retour',
      cancelLabel: 'Annuler le retour'
    }
  },
  {
    path: 'tontine/requests/new',
    component: StockOperationCreatePage,
    data: {
      kind: 'request',
      context: 'TONTINE',
      pageTitle: 'Nouvelle Sortie',
      submitLabel: 'Soumettre la demande',
      showRequestDate: true
    }
  },
  {
    path: 'tontine/requests/:id',
    component: StockOperationDetailPage,
    data: {
      kind: 'request',
      context: 'TONTINE',
      pageTitle: 'Détail de la demande',
      cancelLabel: 'Annuler la demande'
    }
  },
  {
    path: 'tontine/returns/new',
    component: StockOperationCreatePage,
    data: {
      kind: 'return',
      context: 'TONTINE',
      pageTitle: 'Nouveau Retour',
      submitLabel: 'Soumettre le retour',
      showComment: true
    }
  },
  {
    path: 'tontine/returns/:id',
    component: StockOperationDetailPage,
    data: {
      kind: 'return',
      context: 'TONTINE',
      pageTitle: 'Détail du retour',
      cancelLabel: 'Annuler le retour'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StockRoutingModule { }
