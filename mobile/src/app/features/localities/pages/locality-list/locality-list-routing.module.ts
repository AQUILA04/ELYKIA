import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LocalityListPage } from './locality-list.page';

const routes: Routes = [
  {
    path: '',
    component: LocalityListPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LocalityListPageRoutingModule {}
