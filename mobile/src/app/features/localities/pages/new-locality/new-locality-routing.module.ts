import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NewLocalityPage } from './new-locality.page';

const routes: Routes = [
  {
    path: '',
    component: NewLocalityPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NewLocalityPageRoutingModule {}
