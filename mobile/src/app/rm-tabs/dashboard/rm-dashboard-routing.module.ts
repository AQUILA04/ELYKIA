import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmDashboardPage } from './rm-dashboard.page';

const routes: Routes = [{ path: '', component: RmDashboardPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmDashboardPageRoutingModule {}
