import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddComponent } from './article/add/add.component';
import { ListComponent } from './article/list/list.component';
import { DetailComponent } from './article/details/details.component';
import { LocalityAddComponent } from './locality/localityadd/localityadd.component';
import { LocalityListComponent } from './locality/localitylist/localitylist.component';
import { LocalityDetailsComponent } from './locality/localitydetails/localitydetails.component';
import { AccountAddComponent } from './account/accountadd/accountadd.component';
import { AccountListComponent } from './account/accountlist/accountlist.component';
import { ClientAddComponent } from './client/client-add/client-add.component';
import { ClientListComponent } from './client/client-list/client-list.component';
import { ClientDetailsComponent } from './client/client-details/client-details.component';
import { LoginComponent } from './auth/login/login.component';
import { NgxPermissionsGuard } from 'ngx-permissions';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AccountingDayComponent } from './accounting-day/accounting-day.component';
import { CreditAddComponent } from './credit/credit-add/credit-add.component';
import { CreditListComponent } from './credit/credit-list/credit-list.component';
import { CreditDetailsComponent } from './credit/credit-details/credit-details.component';
import { UserAddComponent } from './user/user-add/user-add.component';
import { UserListComponent } from './user/user-list/user-list.component';
import { UserDetailsComponent } from './user/user-details/user-details.component';
import { AccountdetailsComponent } from './account/accountdetails/accountdetails.component';
import { DailyOperationComponent } from './cash-desk/daily-operation/daily-operation.component';
import { OpenCashDeskComponent } from './cash-desk/open-cash-desk/open-cash-desk.component';
import { TFJComponent } from './cash-desk/tfj/tfj.component';
import { BilletageComponent } from './cash-desk/billetage/billetage.component';
import { DashboardChartComponent } from './dashboard-chart/dashboard-chart.component';
import { InventoryComponent } from './inventory/inventory/inventory.component';
import { AddInventoryComponent } from './inventory/inventory-add/inventory-add.component';
import { GestionAddComponent } from './gestion/gestion-add/gestion-add.component';
import { GestionListComponent } from './gestion/gestion-list/gestion-list.component';
import { GestionDetailsComponent } from './gestion/gestion-details/gestion-details.component';
import { OperationAddComponent } from './operation/operation-add/operation-add.component';
import { OperationListComponent } from './operation/operation-list/operation-list.component';
import { OperationDetailsComponent } from './operation/operation-details/operation-details.component';
import { DepositAddComponent } from './deposit/deposit-add/deposit-add.component';
import { DepositListComponent } from './deposit/deposit-list/deposit-list.component';
import { DepositDetailsComponent } from './deposit/deposit-details/deposit-details.component';
import { ReportComponent } from './report/report/report.component';
import { ReactivateLicenseComponent } from './license/reactivate-license/reactivate-license.component';
import { OutListComponent } from './out/out-list/out-list.component';
import { HistoryComponent } from './history/history.component';
import { OutDetailsComponent } from './out/out-details/out-details.component';
import { Back2StoreComponent } from './history/back2-store/back2-store.component';
import { DistributionComponent } from './credit/distribution/distribution.component';
import { CommercialListComponent } from './commercial/commercial-list/commercial-list.component';
import { CommercialViewComponent } from './commercial/commercial-view/commercial-view.component';
import { ClientViewComponent } from './client/client-view/client-view.component';
import { CreditViewComponent } from './credit/credit-view/credit-view.component';
import { OutPdfListComponent } from './out/out-pdf-list/out-pdf-list.component';
import { OldReleaseListComponent } from "./out/old-release-list/old-release-list.component";
import { ChangeDailyStakeComponent } from './credit/change-daily-stake/change-daily-stake.component';
import { CreateTontineComponent } from "./credit/components/create-tontine/create-tontine.component";
import { AuthGuard } from "./auth/guards/auth.guard";

const routes: Routes = [
  // Route publique - Login
  { path: 'login', component: LoginComponent },
  { path: 'license', component: ReactivateLicenseComponent },

  // Redirection par défaut
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // === ROUTES PROTÉGÉES ===
  // Toutes les routes ci-dessous nécessitent une authentification

  // Dashboard
  {
    path: 'home',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'chart',
    component: DashboardChartComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // === ROUTES COMMANDES (Order Management) ===
  {
    path: 'orders',
    loadChildren: () => import('./orders/orders.module').then(m => m.OrdersModule),
    canActivate: [AuthGuard, NgxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_CONSULT_CREDIT', 'ROLE_EDIT_CREDIT'],
        redirectTo: '/home'
      },
      breadcrumb: 'Gestion des Commandes'
    }
  },

  // === ROUTES BI DASHBOARD ===
  {
    path: 'bi',
    loadChildren: () => import('./bi/bi.module').then(m => m.BiModule),
    canActivate: [AuthGuard, NgxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_REPORT'],
        redirectTo: '/home'
      },
      breadcrumb: 'Dashboard BI'
    }
  },

  // === ROUTES TONTINE ===
  {
    path: 'tontine',
    loadChildren: () => import('./tontine/tontine.module').then(m => m.TontineModule),
    canActivate: [AuthGuard, NgxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_TONTINE', 'ROLE_EDIT_TONTINE'],
        redirectTo: '/home'
      },
      breadcrumb: 'Gestion des Tontines'
    }
  },

  // Articles/Items
  {
    path: 'add',
    component: AddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'add/:id',
    component: AddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'list',
    component: ListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'details/:id',
    component: DetailComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // Localités
  {
    path: 'locality-add/:id',
    component: LocalityAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'locality-add',
    component: LocalityAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'localitylist',
    component: LocalityListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'localitydetails/:id',
    component: LocalityDetailsComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // Crédits
  {
    path: 'credit-add',
    component: CreditAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'credit-add/:id',
    component: CreditAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'credit-list',
    component: CreditListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'credit-details/:id',
    component: CreditDetailsComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'credit-view/:id/:client-type',
    component: CreditViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'create-tontine',
    component: CreateTontineComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'change-daily-stake/:id',
    component: ChangeDailyStakeComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'distribute/:id',
    component: DistributionComponent,
    canActivate: [AuthGuard]
  },

  // Comptes
  {
    path: 'account-add',
    component: AccountAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'account-add/:id',
    component: AccountAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'accountlist',
    component: AccountListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'accountdetails/:id',
    component: AccountdetailsComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // Clients
  {
    path: 'client-add',
    component: ClientAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'client-add/:id',
    component: ClientAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'client-list',
    component: ClientListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'client-details/:id',
    component: ClientDetailsComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'client-view/:id',
    component: ClientViewComponent,
    canActivate: [AuthGuard]
  },

  // Utilisateurs
  {
    path: 'user-add/:id',
    component: UserAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user-add',
    component: UserAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'user-list',
    component: UserListComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'user-details/:id',
    component: UserDetailsComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // Commerciaux
  {
    path: 'commercial-list',
    component: CommercialListComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'commercial-view/:id',
    component: CommercialViewComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'commercial-view/:id/:username',
    component: CommercialViewComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // Caisse
  {
    path: 'accounting-day',
    component: AccountingDayComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'daily-operation',
    component: DailyOperationComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'open-cashDesk',
    component: OpenCashDeskComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'billetage',
    component: BilletageComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'tfj',
    component: TFJComponent,
    canActivate: [AuthGuard]
  },

  // Inventaire
  {
    path: 'inventory',
    component: InventoryComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'inventory-add',
    component: AddInventoryComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // Gestion
  {
    path: 'gestion-add',
    component: GestionAddComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'gestion-add/:id',
    component: GestionAddComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'gestion-list',
    component: GestionListComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'gestion-details/:id',
    component: GestionDetailsComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // Opérations
  {
    path: 'operation-add',
    component: OperationAddComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'operation-add/:id',
    component: OperationAddComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'operation-list',
    component: OperationListComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'operation-details',
    component: OperationDetailsComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // Dépôts
  {
    path: 'deposit-add',
    component: DepositAddComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'deposit-add/:id',
    component: DepositAddComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'deposit-list',
    component: DepositListComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'deposit-details',
    component: DepositDetailsComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // Sorties
  {
    path: 'out-list',
    component: OutListComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'out-details/:id',
    component: OutDetailsComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'out-pdf-list',
    component: OutPdfListComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'old-release-list',
    component: OldReleaseListComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },

  // Historique
  {
    path: 'history',
    component: HistoryComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'history-details/:id',
    component: OutDetailsComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  {
    path: 'back-store/:id',
    component: Back2StoreComponent,
    canActivate: [AuthGuard]
  },

  // Rapports
  {
    path: 'report',
    component: ReportComponent,
    canActivate: [AuthGuard],
    data: { breadcrumb: '' }
  },
  { path: 'article-type', loadChildren: () => import('./article-type/article-type.module').then(m => m.ArticleTypeModule) },
  {
    path: 'expense',
    loadChildren: () => import('./expense/expense.module').then(m => m.ExpenseModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'security',
    loadChildren: () => import('./security/security.module').then(m => m.SecurityModule),
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
