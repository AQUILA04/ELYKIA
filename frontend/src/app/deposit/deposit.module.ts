import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxSpinnerModule } from 'ngx-spinner';
import { DepositRoutingModule } from './deposit-routing.module';
import { DepositListComponent } from './deposit-list/deposit-list.component';
import { DepositAddComponent } from './deposit-add/deposit-add.component';
import { DepositDetailsComponent } from './deposit-details/deposit-details.component';

@NgModule({
  declarations: [
    DepositListComponent,
    DepositAddComponent,
    DepositDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTooltipModule,
    NgxSpinnerModule,
    DepositRoutingModule
  ]
})
export class DepositModule {}
