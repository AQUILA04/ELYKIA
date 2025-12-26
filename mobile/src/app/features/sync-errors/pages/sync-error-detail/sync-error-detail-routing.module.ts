import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SyncErrorDetailPage } from './sync-error-detail.page';

const routes: Routes = [
  {
    path: '',
    component: SyncErrorDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SyncErrorDetailPageRoutingModule {}
