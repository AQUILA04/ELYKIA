import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { EditDistributionPage } from './edit-distribution.page';
import { UnsavedChangesGuard } from '../../../../core/guards/unsaved-changes.guard';

const routes: Routes = [
  {
    path: '',
    component: EditDistributionPage,
    canDeactivate: [UnsavedChangesGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EditDistributionPageRoutingModule {}