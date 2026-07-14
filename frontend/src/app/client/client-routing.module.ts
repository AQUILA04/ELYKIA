import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClientAddComponent } from './client-add/client-add.component';
import { ClientListComponent } from './client-list/client-list.component';
import { ClientDetailsComponent } from './client-details/client-details.component';
import { ClientViewComponent } from './client-view/client-view.component';

const routes: Routes = [
  { path: 'list', component: ClientListComponent },
  { path: 'add', component: ClientAddComponent },
  { path: 'add/:id', component: ClientAddComponent },
  { path: 'details/:id', component: ClientDetailsComponent },
  { path: 'view/:id', component: ClientViewComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClientRoutingModule {}
