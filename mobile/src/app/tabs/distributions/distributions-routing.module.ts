
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DistributionsListPage } from './distributions-list.page';

const routes: Routes = [
  {
    path: '',
    component: DistributionsListPage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DistributionsPageRoutingModule {}
