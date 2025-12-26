import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../auth/guards/auth.guard'; // Assuming AuthGuard path
import { TontineDashboardComponent } from './pages/tontine-dashboard/tontine-dashboard.component';
import { MemberDetailsComponent } from './pages/member-details/member-details.component';
import { SessionComparisonComponent } from './pages/session-comparison/session-comparison.component';
import { TontineMagasinierDashboardComponent } from './pages/magasinier-dashboard/tontine-magasinier-dashboard.component'; // New component

const routes: Routes = [
  {
    path: '',
    component: TontineDashboardComponent
  },
  {
    path: 'member/:id',
    component: MemberDetailsComponent
  },
  {
    path: 'compare',
    component: SessionComparisonComponent
  },
  {
    path: 'magasinier',
    component: TontineMagasinierDashboardComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ROLE_MAGASINIER'] } // Protect with role guard
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TontineRoutingModule { }
