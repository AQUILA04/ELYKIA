import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GestionListComponent } from './gestion-list/gestion-list.component';
import { GestionAddComponent } from './gestion-add/gestion-add.component';
import { GestionDetailsComponent } from './gestion-details/gestion-details.component';

const routes: Routes = [
  { path: 'list', component: GestionListComponent },
  { path: 'add', component: GestionAddComponent },
  { path: 'add/:id', component: GestionAddComponent },
  { path: 'details/:id', component: GestionDetailsComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class GestionRoutingModule {}
