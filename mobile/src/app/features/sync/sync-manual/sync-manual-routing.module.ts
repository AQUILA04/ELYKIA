import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SyncManualPage } from './sync-manual.page';

const routes: Routes = [
  {
    path: '',
    component: SyncManualPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SyncManualPageRoutingModule {}
