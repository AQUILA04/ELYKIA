import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClientsPage } from './clients.page';

const routes: Routes = [
  {
    path: '',
    component: ClientsPage,
  },
  {
    path: 'new-client',
    loadChildren: () => import('../../features/clients/new-client/new-client.module').then( m => m.NewClientPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClientsPageRoutingModule {}