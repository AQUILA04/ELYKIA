import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LocalityAddComponent } from './locality/localityadd/localityadd.component';
import { LocalityListComponent } from './locality/localitylist/localitylist.component';
import { LocalityDetailsComponent } from './locality/localitydetails/localitydetails.component';
import { AccountAddComponent } from './account/accountadd/accountadd.component';
import { AccountListComponent } from './account/accountlist/accountlist.component';
import { LoginComponent } from './auth/login/login.component';
import { NgxPermissionsGuard } from 'ngx-permissions';
import { AccountdetailsComponent } from './account/accountdetails/accountdetails.component';
import { DailyOperationComponent } from './cash-desk/daily-operation/daily-operation.component';
import { OpenCashDeskComponent } from './cash-desk/open-cash-desk/open-cash-desk.component';
import { TFJComponent } from './cash-desk/tfj/tfj.component';
import { BilletageComponent } from './cash-desk/billetage/billetage.component';
import { DashboardChartComponent } from './dashboard-chart/dashboard-chart.component';
import { GestionAddComponent } from './gestion/gestion-add/gestion-add.component';
import { GestionListComponent } from './gestion/gestion-list/gestion-list.component';
import { GestionDetailsComponent } from './gestion/gestion-details/gestion-details.component';
import { OperationAddComponent } from './operation/operation-add/operation-add.component';
import { OperationListComponent } from './operation/operation-list/operation-list.component';
import { OperationDetailsComponent } from './operation/operation-details/operation-details.component';
import { DepositAddComponent } from './deposit/deposit-add/deposit-add.component';
import { DepositListComponent } from './deposit/deposit-list/deposit-list.component';
import { DepositDetailsComponent } from './deposit/deposit-details/deposit-details.component';
import { ReactivateLicenseComponent } from './license/reactivate-license/reactivate-license.component';
import { OutListComponent } from './out/out-list/out-list.component';
import { HistoryComponent } from './history/history.component';
import { OutDetailsComponent } from './out/out-details/out-details.component';
import { Back2StoreComponent } from './history/back2-store/back2-store.component';
import { CommercialListComponent } from './commercial/commercial-list/commercial-list.component';
import { CommercialViewComponent } from './commercial/commercial-view/commercial-view.component';
import { OutPdfListComponent } from './out/out-pdf-list/out-pdf-list.component';
import { OldReleaseListComponent } from "./out/old-release-list/old-release-list.component";
import { AuthGuard } from "./auth/guards/auth.guard";
import { AiChatGuard } from './ai-chat/guards/ai-chat.guard';
import { MobileMoneyConfigListComponent } from './mobile-money-config/mobile-money-config-list/mobile-money-config-list.component';
import { FeatureFlagGuard } from './shared/guards/feature-flag.guard';
import { FeatureFlags } from './shared/service/feature-flag.service';

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
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'chart',
    component: DashboardChartComponent,
    canActivate: [AuthGuard]
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
      }
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
      }
    }
  },

  // === ELYKIA IA ===
  {
    path: 'ai-chat',
    loadChildren: () => import('./ai-chat/ai-chat.module').then(m => m.AiChatModule),
    canActivate: [AuthGuard, NgxPermissionsGuard, AiChatGuard],
    data: {
      permissions: {
        only: ['ROLE_AI_CHAT'],
        redirectTo: '/home',
      },
    },
  },

  // === ROUTES TONTINE ===
  {
    path: 'tontine',
    loadChildren: () => import('./tontine/tontine.module').then(m => m.TontineModule),
    canActivate: [AuthGuard, NgxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_TONTINE', 'ROLE_EDIT_TONTINE', 'ROLE_CONSULT_TONTINE'],
        redirectTo: '/home'
      }
    }
  },

  // === ROUTES STOCK (Module Stock Commercial) ===
  {
    path: 'stock',
    loadChildren: () => import('./stock/stock.module').then(m => m.StockModule),
    canActivate: [AuthGuard]
  },

  // === ROUTES STOCK TONTINE (Nouveau Module) ===
  {
    path: 'stock-tontine',
    loadChildren: () => import('./stock-tontine/stock-tontine.module').then(m => m.StockTontineModule),
    canActivate: [AuthGuard]
  },

  // Articles/Items (lazy-loaded)
  {
    path: 'article',
    loadChildren: () => import('./article/article.module').then(m => m.ArticleModule),
    canActivate: [AuthGuard]
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
    canActivate: [AuthGuard]
  },

  // Crédits (lazy-loaded)
  {
    path: 'credit',
    loadChildren: () => import('./credit/credit.module').then(m => m.CreditModule),
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
    canActivate: [AuthGuard]
  },

  // Clients
  {
    path: 'client',
    loadChildren: () => import('./client/client.module').then(m => m.ClientModule),
    canActivate: [AuthGuard],
  },

  // Utilisateurs
  {
    path: 'user',
    loadChildren: () => import('./user/user.module').then(m => m.UserModule),
    canActivate: [AuthGuard],
  },

  // Commerciaux
  {
    path: 'commercial-list',
    component: CommercialListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'commercial-view/:id',
    component: CommercialViewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'commercial-view/:id/:username',
    component: CommercialViewComponent,
    canActivate: [AuthGuard]
  },

  // Caisse
  {
    path: 'accounting-day',
    loadChildren: () => import('./accounting-day/accounting-day.module').then(m => m.AccountingDayModule),
    canActivate: [AuthGuard],
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
    canActivate: [AuthGuard]
  },
  {
    path: 'tfj',
    component: TFJComponent,
    canActivate: [AuthGuard]
  },

  // Inventaire (lazy)
  {
    path: 'inventory',
    loadChildren: () => import('./inventory/inventory.module').then(m => m.InventoryModule),
    canActivate: [AuthGuard]
  },

  // Gestion
  {
    path: 'gestion-add',
    component: GestionAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'gestion-add/:id',
    component: GestionAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'gestion-list',
    component: GestionListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'gestion-details/:id',
    component: GestionDetailsComponent,
    canActivate: [AuthGuard]
  },

  // Opérations
  {
    path: 'operation-add',
    component: OperationAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'operation-add/:id',
    component: OperationAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'operation-list',
    component: OperationListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'operation-details',
    component: OperationDetailsComponent,
    canActivate: [AuthGuard]
  },

  // Dépôts
  {
    path: 'deposit-add',
    component: DepositAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'deposit-add/:id',
    component: DepositAddComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'deposit-list',
    component: DepositListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'deposit-details',
    component: DepositDetailsComponent,
    canActivate: [AuthGuard]
  },

  // Sorties
  {
    path: 'out-list',
    component: OutListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'out-details/:id',
    component: OutDetailsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'out-pdf-list',
    component: OutPdfListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'old-release-list',
    component: OldReleaseListComponent,
    canActivate: [AuthGuard]
  },

  // Historique
  {
    path: 'history',
    component: HistoryComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'history-details/:id',
    component: OutDetailsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'back-store/:id',
    component: Back2StoreComponent,
    canActivate: [AuthGuard]
  },

  // Rapports
  {
    path: 'report',
    loadChildren: () => import('./report/report.module').then(m => m.ReportModule),
    canActivate: [AuthGuard]
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
  },
  {
    path: 'parameters',
    loadChildren: () => import('./parameters/parameters.module').then(m => m.ParametersModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'configuration/mobile-money',
    component: MobileMoneyConfigListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'recruitment',
    loadChildren: () => import('./recruitment/recruitment.module').then(m => m.RecruitmentModule),
    canActivate: [AuthGuard, NgxPermissionsGuard, FeatureFlagGuard],
    data: {
      featureFlag: FeatureFlags.Recruitment,
      permissions: {
        only: ['ROLE_ADMIN', 'ROLE_RECRUITMENT'],
        redirectTo: '/home'
      }
    }
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
