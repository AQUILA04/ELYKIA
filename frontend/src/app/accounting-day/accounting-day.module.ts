import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingDayRoutingModule } from './accounting-day-routing.module';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { AccountingDayComponent } from './accounting-day.component';

@NgModule({
  declarations: [AccountingDayComponent],
  imports: [
    CommonModule,
    FormsModule,
    AccountingDayRoutingModule,
    NgxPermissionsModule,
    NgxSpinnerModule,
  ],
})
export class AccountingDayModule {}
