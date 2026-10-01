import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxPermissionsModule } from 'ngx-permissions';
import { MatPaginatorModule } from '@angular/material/paginator';
import { SharedComponentsModule } from '../shared/components/shared-components.module';
import { AccountRoutingModule } from './account-routing.module';
import { AccountAddComponent } from './accountadd/accountadd.component';
import { AccountListComponent } from './accountlist/accountlist.component';
import { AccountdetailsComponent } from './accountdetails/accountdetails.component';

@NgModule({
  declarations: [
    AccountAddComponent,
    AccountListComponent,
    AccountdetailsComponent,
  ],
  imports: [
    CommonModule,
    AccountRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgxPermissionsModule,
    MatPaginatorModule,
    SharedComponentsModule,
  ],
})
export class AccountModule {}
