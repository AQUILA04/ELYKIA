import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LocalityListComponent } from './localitylist/localitylist.component';
import { LocalityAddComponent } from './localityadd/localityadd.component';
import { LocalityDetailsComponent } from './localitydetails/localitydetails.component';

const routes: Routes = [
  { path: 'list', component: LocalityListComponent },
  { path: 'add', component: LocalityAddComponent },
  { path: 'add/:id', component: LocalityAddComponent },
  { path: 'details/:id', component: LocalityDetailsComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LocalityRoutingModule {}
