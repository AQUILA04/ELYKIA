import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { InitializationGuard } from './core/guards/initialization.guard';

const routes: Routes = [
  {
    path: 'tontine/delivery-creation',
    loadChildren: () => import('./features/tontine/pages/delivery-creation/delivery-creation.module').then(m => m.DeliveryCreationPageModule)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./features/auth/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'distributions/new',
    loadChildren: () => import('./features/distributions/pages/new-distribution/new-distribution.module').then(m => m.NewDistributionPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'distributions/edit/:id',
    loadChildren: () => import('./features/distributions/pages/edit-distribution/edit-distribution.module').then(m => m.EditDistributionPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'recovery',
    loadChildren: () => import('./features/recovery/recovery.module').then(m => m.RecoveryPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'initial-loading',
    loadChildren: () => import('./features/initial-loading/initial-loading.module').then(m => m.InitialLoadingPageModule),
    canActivate: [AuthGuard, InitializationGuard]
  },
  {
    path: 'client-detail/:id',
    loadChildren: () => import('./features/clients/pages/client-detail/client-detail.module').then(m => m.ClientDetailPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'report',
    loadChildren: () => import('./features/rapport-journalier/pages/rapport-journalier/rapport-journalier.module').then(m => m.RapportJournalierPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'sync/automatic',
    loadChildren: () => import('./features/sync/sync-automatic/sync-automatic.module').then(m => m.SyncAutomaticPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'sync/manual',
    loadChildren: () => import('./features/sync/sync-manual/sync-manual.module').then(m => m.SyncManualPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'sync-errors',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./features/sync-errors/pages/sync-error-list/sync-error-list.module').then(m => m.SyncErrorListPageModule)
      },
      {
        path: ':id',
        loadChildren: () => import('./features/sync-errors/pages/sync-error-detail/sync-error-detail.module').then(m => m.SyncErrorDetailPageModule)
      }
    ]
  },
  {
    path: 'edit-client/:id',
    loadChildren: () => import('./features/clients/pages/edit-client/edit-client.module').then(m => m.EditClientPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'recovery-client-list',
    loadChildren: () => import('./features/recovery-client-list/recovery-client-list.module').then(m => m.RecoveryClientListPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'orders',
    loadChildren: () => import('./features/orders/orders.module').then(m => m.OrdersModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'tontine/dashboard',
    loadChildren: () => import('./features/tontine/dashboard/tontine-dashboard.module').then(m => m.TontineDashboardPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'tontine/member-registration',
    loadChildren: () => import('./features/tontine/pages/member-registration/member-registration.module').then(m => m.MemberRegistrationPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'tontine/member-detail/:id',
    loadChildren: () => import('./features/tontine/pages/member-detail/member-detail.module').then(m => m.MemberDetailPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'tontine/collection-recording',
    loadChildren: () => import('./features/tontine/pages/collection-recording/collection-recording.module').then(m => m.CollectionRecordingPageModule),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/tabs/dashboard', pathMatch: 'full' },

];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }

