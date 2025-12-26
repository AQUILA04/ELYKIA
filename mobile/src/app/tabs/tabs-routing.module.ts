import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      {
        path: 'clients',
        loadChildren: () => import('./clients/clients.module').then(m => m.ClientsPageModule)
      },
      {
        path: 'distributions',
        loadChildren: () => import('./distributions/distributions.module').then(m => m.DistributionsPageModule)
      },
      {
        path: 'more',
        loadChildren: () => import('./more/more.module').then(m => m.MorePageModule)
      },
      {
        path: 'localities',
        loadChildren: () => import('../features/localities/localities.module').then(m => m.LocalitiesModule)
      },
      {
        path: 'article-list',
        loadChildren: () => import('../features/articles/pages/article-list/article-list.module').then(m => m.ArticleListPageModule)
      },
      {
        path: 'orders',
        loadChildren: () => import('../features/orders/orders.module').then(m => m.OrdersModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '/tabs/dashboard',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule {}
