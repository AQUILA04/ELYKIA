import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ActivityLogListComponent } from './pages/activity-log-list/activity-log-list.component';

const routes: Routes = [
  { path: '', component: ActivityLogListComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomerActivityAuditRoutingModule {}
