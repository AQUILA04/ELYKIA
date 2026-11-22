import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OperationListComponent } from './operation-list/operation-list.component';
import { OperationAddComponent } from './operation-add/operation-add.component';
import { OperationDetailsComponent } from './operation-details/operation-details.component';

const routes: Routes = [
  { path: 'list', component: OperationListComponent },
  { path: 'add', component: OperationAddComponent },
  { path: 'add/:id', component: OperationAddComponent },
  { path: 'details', component: OperationDetailsComponent },
  { path: 'details/:id', component: OperationDetailsComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperationRoutingModule {}
