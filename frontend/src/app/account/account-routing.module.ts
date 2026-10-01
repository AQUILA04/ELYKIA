import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountAddComponent } from './accountadd/accountadd.component';
import { AccountListComponent } from './accountlist/accountlist.component';
import { AccountdetailsComponent } from './accountdetails/accountdetails.component';

const routes: Routes = [
  { path: 'list', component: AccountListComponent },
  { path: 'add', component: AccountAddComponent },
  { path: 'add/:id', component: AccountAddComponent },
  { path: 'details/:id', component: AccountdetailsComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccountRoutingModule {}
