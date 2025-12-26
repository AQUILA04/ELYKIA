import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SyncAutomaticPage } from './sync-automatic.page';

const routes: Routes = [
  {
    path: '',
    component: SyncAutomaticPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SyncAutomaticPageRoutingModule {}