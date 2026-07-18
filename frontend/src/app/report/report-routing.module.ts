import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NgxPermissionsGuard } from 'ngx-permissions';
import { FeatureFlagGuard } from '../shared/guards/feature-flag.guard';
import { FeatureFlags } from '../shared/service/feature-flag.service';
import { ReportComponent } from './report/report.component';
import { DailyReportComponent } from './pages/daily-report/daily-report.component';
import { MonthlyReportsComponent } from './pages/monthly-reports/monthly-reports.component';

const routes: Routes = [
  { path: '', component: ReportComponent },
  { path: 'daily', component: DailyReportComponent },
  {
    path: 'monthly',
    component: MonthlyReportsComponent,
    canActivate: [NgxPermissionsGuard, FeatureFlagGuard],
    data: {
      featureFlag: FeatureFlags.MonthlyReports,
      permissions: {
        only: ['ROLE_REPORT'],
        redirectTo: '/home',
      },
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportRoutingModule {}
