import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RmTabsPage } from './rm-tabs.page';
import { RmPlanGuard } from '../core/guards/rm-plan.guard';

const routes: Routes = [
  {
    path: '',
    component: RmTabsPage,
    canActivate: [RmPlanGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./dashboard/rm-dashboard.module').then(m => m.RmDashboardPageModule)
      },
      {
        path: 'field',
        loadChildren: () => import('./field/rm-field.module').then(m => m.RmFieldPageModule)
      },
      {
        path: 'clients',
        loadChildren: () => import('./clients/rm-clients.module').then(m => m.RmClientsPageModule)
      },
      {
        path: 'more',
        loadChildren: () => import('./more/rm-more.module').then(m => m.RmMorePageModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class RmTabsPageRoutingModule {}
