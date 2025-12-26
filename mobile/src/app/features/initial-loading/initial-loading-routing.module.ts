import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InitialLoadingPage } from './initial-loading.page';

const routes: Routes = [
  {
    path: '',
    component: InitialLoadingPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InitialLoadingPageRoutingModule {}
