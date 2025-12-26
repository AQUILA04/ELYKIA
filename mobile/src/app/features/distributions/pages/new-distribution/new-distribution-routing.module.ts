import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { NewDistributionPage } from './new-distribution.page';

import { UnsavedChangesGuard } from '../../../../core/guards/unsaved-changes.guard';

const routes: Routes = [
  {
    path: '',
    component: NewDistributionPage,
    canDeactivate: [UnsavedChangesGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NewDistributionPageRoutingModule {}

