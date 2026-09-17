import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomerPaymentsRoutingModule } from './customer-payments-routing.module';
import { CustomerPaymentsListComponent } from './pages/customer-payments-list/customer-payments-list.component';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [CustomerPaymentsListComponent],
  imports: [
    CommonModule,
    CustomerPaymentsRoutingModule,
    MatButtonModule
  ]
})
export class CustomerPaymentsModule {}
