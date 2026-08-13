import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxPermissionsModule } from 'ngx-permissions';

import { ReportRoutingModule } from './report-routing.module';
import { SharedComponentsModule } from '../shared/components/shared-components.module';
import { BilletageModule } from '../cash-desk/billetage/billetage.module';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';

import { ReportComponent } from './report/report.component';
import { DailyReportComponent } from './pages/daily-report/daily-report.component';
import { MonthlyReportsComponent } from './pages/monthly-reports/monthly-reports.component';
import { CashDepositModalComponent } from './components/cash-deposit-modal/cash-deposit-modal.component';
import { RecoveryManagerReportTabComponent } from './components/recovery-manager-report-tab/recovery-manager-report-tab.component';
import { CashPeriodRemittanceTabComponent } from './components/cash-period-remittance-tab/cash-period-remittance-tab.component';
import { RemainingAtClientsDialogComponent } from './components/remaining-at-clients-dialog/remaining-at-clients-dialog.component';

@NgModule({
  declarations: [
    ReportComponent,
    DailyReportComponent,
    MonthlyReportsComponent,
    CashDepositModalComponent,
    RecoveryManagerReportTabComponent,
    CashPeriodRemittanceTabComponent,
    RemainingAtClientsDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ReportRoutingModule,
    SharedComponentsModule,
    BilletageModule,
    NgSelectModule,
    NgxPermissionsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatCardModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatExpansionModule,
  ],
})
export class ReportModule {}
