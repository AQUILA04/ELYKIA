import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmPlanPage } from './rm-plan.page';

const routes: Routes = [{ path: '', component: RmPlanPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RmPlanPageRoutingModule {}
