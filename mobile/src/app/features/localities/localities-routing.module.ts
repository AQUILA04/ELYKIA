import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./pages/locality-list/locality-list.module').then(m => m.LocalityListPageModule)
  },
  {
    path: 'new',
    loadChildren: () => import('./pages/new-locality/new-locality.module').then(m => m.NewLocalityPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LocalitiesRoutingModule { }
