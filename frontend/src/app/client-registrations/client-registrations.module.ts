import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClientRegistrationsRoutingModule } from './client-registrations-routing.module';
import { ClientRegistrationsListComponent } from './pages/client-registrations-list/client-registrations-list.component';

@NgModule({
  declarations: [ClientRegistrationsListComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ClientRegistrationsRoutingModule
  ]
})
export class ClientRegistrationsModule {}
