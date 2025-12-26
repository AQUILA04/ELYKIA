import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RecoveryClientListPage } from './recovery-client-list.page';

const routes: Routes = [
  {
    path: '',
    component: RecoveryClientListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RecoveryClientListPageRoutingModule {}
