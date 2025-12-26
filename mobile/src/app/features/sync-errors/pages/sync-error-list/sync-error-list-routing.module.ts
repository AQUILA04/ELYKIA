import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SyncErrorListPage } from './sync-error-list.page';

const routes: Routes = [
  {
    path: '',
    component: SyncErrorListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SyncErrorListPageRoutingModule {}
