import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ClientRegistrationsListComponent } from './pages/client-registrations-list/client-registrations-list.component';

const routes: Routes = [
  {
    path: '',
    component: ClientRegistrationsListComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClientRegistrationsRoutingModule {}
