import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommercialListComponent } from './commercial-list/commercial-list.component';
import { CommercialViewComponent } from './commercial-view/commercial-view.component';

const routes: Routes = [
  { path: 'list', component: CommercialListComponent },
  { path: 'view/:id', component: CommercialViewComponent },
  { path: 'view/:id/:username', component: CommercialViewComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CommercialRoutingModule {}
