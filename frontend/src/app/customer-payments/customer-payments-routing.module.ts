import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerPaymentsListComponent } from './pages/customer-payments-list/customer-payments-list.component';

const routes: Routes = [
  { path: '', component: CustomerPaymentsListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerPaymentsRoutingModule {}
