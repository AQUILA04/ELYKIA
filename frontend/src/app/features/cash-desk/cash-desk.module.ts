import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgxSpinnerModule } from 'ngx-spinner';
import { SharedComponentsModule } from '@shared/components/shared-components.module';
import { BilletageModule } from './billetage/billetage.module';
import { CashDeskRoutingModule } from './cash-desk-routing.module';
import { OpenCashDeskComponent } from './open-cash-desk/open-cash-desk.component';
import { CloseCashDeskComponent } from './close-cash-desk/close-cash-desk.component';
import { DailyOperationComponent } from './daily-operation/daily-operation.component';
import { TFJComponent } from './tfj/tfj.component';

@NgModule({
  declarations: [
    OpenCashDeskComponent,
    CloseCashDeskComponent,
    DailyOperationComponent,
    TFJComponent
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
    MatStepperModule,
    MatTableModule,
    MatTooltipModule,
    NgxPermissionsModule,
    NgxSpinnerModule,
    SharedComponentsModule,
    BilletageModule,
    CashDeskRoutingModule
  ]
})
export class CashDeskModule {}
