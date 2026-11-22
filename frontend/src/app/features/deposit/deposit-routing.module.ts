import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DepositListComponent } from './deposit-list/deposit-list.component';
import { DepositAddComponent } from './deposit-add/deposit-add.component';
import { DepositDetailsComponent } from './deposit-details/deposit-details.component';

const routes: Routes = [
  { path: 'list', component: DepositListComponent },
  { path: 'add', component: DepositAddComponent },
  { path: 'add/:id', component: DepositAddComponent },
  { path: 'details', component: DepositDetailsComponent },
  { path: 'details/:id', component: DepositDetailsComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DepositRoutingModule {}
