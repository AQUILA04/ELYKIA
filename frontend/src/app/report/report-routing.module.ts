import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NgxPermissionsGuard } from 'ngx-permissions';
import { FeatureFlagGuard } from '../shared/guards/feature-flag.guard';
import { FeatureFlags } from '../shared/service/feature-flag.service';
import { ReportComponent } from './report/report.component';
import { DailyReportComponent } from './pages/daily-report/daily-report.component';
import { MonthlyReportsComponent } from './pages/monthly-reports/monthly-reports.component';
import { ReportCockpitComponent } from './pages/report-cockpit/report-cockpit.component';
import { CommercialSheetComponent } from './pages/commercial-sheet/commercial-sheet.component';
import { ReportDepositsComponent } from './pages/report-deposits/report-deposits.component';
import { ReportJournalComponent } from './pages/report-journal/report-journal.component';

const routes: Routes = [
  { path: '', component: ReportComponent },
  // Nouveau rapport commerciaux (ouvert par le menu). L'ancienne présentation reste sur /classic.
  { path: 'daily', component: ReportCockpitComponent },
  { path: 'daily/classic', component: DailyReportComponent },
  { path: 'daily/commercials/:username', component: CommercialSheetComponent },
  { path: 'daily/deposits', component: ReportDepositsComponent },
  { path: 'daily/journal', component: ReportJournalComponent },
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
