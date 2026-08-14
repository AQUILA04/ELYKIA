import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgChartsModule } from 'ng2-charts';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { DashboardChartModule } from '../dashboard-chart/dashboard-chart.module';
import { SharedComponentsModule } from '../shared/components/shared-components.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { DashboardV2Component } from './dashboard-v2/dashboard-v2.component';
import { DashboardKpiCardComponent } from './dashboard-v2/components/dashboard-kpi-card/dashboard-kpi-card.component';
import { RecentSalesPanelComponent } from './dashboard-v2/components/recent-sales-panel/recent-sales-panel.component';
import { RecentActivityPanelComponent } from './dashboard-v2/components/recent-activity-panel/recent-activity-panel.component';
import { SalesEvolutionChartComponent } from './dashboard-v2/components/sales-evolution-chart/sales-evolution-chart.component';
import { StockStatusChartComponent } from './dashboard-v2/components/stock-status-chart/stock-status-chart.component';
import { DashboardStockkeeperAlertsComponent } from './dashboard-v2/components/dashboard-stockkeeper-alerts/dashboard-stockkeeper-alerts.component';
import { TimeAgoPipe } from './dashboard-v2/pipes/time-ago.pipe';

@NgModule({
  declarations: [
    DashboardComponent,
    DashboardV2Component,
    DashboardKpiCardComponent,
    RecentSalesPanelComponent,
    RecentActivityPanelComponent,
    SalesEvolutionChartComponent,
    StockStatusChartComponent,
    DashboardStockkeeperAlertsComponent,
    TimeAgoPipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DashboardRoutingModule,
    DashboardChartModule,
    SharedComponentsModule,
    NgxPermissionsModule,
    NgChartsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule
  ]
})
export class DashboardModule {}
