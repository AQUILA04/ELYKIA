import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { NgxPermissionsGuard } from 'ngx-permissions';
import { DashboardChartComponent } from './dashboard-chart/dashboard-chart.component';
import { ReactivateLicenseComponent } from './license/reactivate-license/reactivate-license.component';
import { AuthGuard } from "./auth/guards/auth.guard";
import { AiChatGuard } from './ai-chat/guards/ai-chat.guard';
import { MobileMoneyConfigListComponent } from './mobile-money-config/mobile-money-config-list/mobile-money-config-list.component';
import { WithdrawalFeeGridComponent } from './mobile-money-config/withdrawal-fee-grid/withdrawal-fee-grid.component';
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

  {
    path: 'customer-payments',
    loadChildren: () => import('./customer-payments/customer-payments.module').then(m => m.CustomerPaymentsModule),
    canActivate: [AuthGuard]
  },

  {
    path: 'client-registrations',
    loadChildren: () => import('./client-registrations/client-registrations.module').then(m => m.ClientRegistrationsModule),
    canActivate: [AuthGuard, NgxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_VALIDATE_CLIENT_REGISTRATION', 'ROLE_CONSULT_CLIENT', 'ROLE_EDIT_CLIENT', 'ROLE_ADMIN'],
        redirectTo: '/home'
      }
    }
  },

  {
    path: 'audit',
    loadChildren: () => import('./customer-activity-audit/customer-activity-audit.module')
      .then(m => m.CustomerActivityAuditModule),
    canActivate: [AuthGuard, NgxPermissionsGuard],
    data: {
      permissions: {
        only: ['ROLE_AUDIT'],
        redirectTo: '/home'
      }
    }
  },

  {
    path: 'notifications',
    loadChildren: () => import('./notifications/notifications.module').then(m => m.NotificationsModule),
    canActivate: [AuthGuard]
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
        only: ['ROLE_TONTINE', 'ROLE_EDIT_TONTINE', 'ROLE_CONSULT_TONTINE', 'ROLE_ADMIN'],
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

  // Anciennes URLs Stock Tontine : redirigées vers Stock Commercial ?channel=tontine
  {
    path: 'stock-tontine',
    loadChildren: () => import('./stock/stock-legacy-redirect.module').then(m => m.StockLegacyRedirectModule),
    canActivate: [AuthGuard]
  },

  // Articles/Items (lazy-loaded)
  {
    path: 'article',
    loadChildren: () => import('./article/article.module').then(m => m.ArticleModule),
    canActivate: [AuthGuard]
  },

  // Localités (lazy-loaded)
  {
    path: 'locality',
    loadChildren: () => import('./locality/locality.module').then(m => m.LocalityModule),
    canActivate: [AuthGuard]
  },

  // Crédits (lazy-loaded)
  {
    path: 'credit',
    loadChildren: () => import('./credit/credit.module').then(m => m.CreditModule),
    canActivate: [AuthGuard]
  },

  // Comptes (lazy-loaded)
  {
    path: 'account',
    loadChildren: () => import('./account/account.module').then(m => m.AccountModule),
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
    path: 'commercial',
    loadChildren: () => import('./commercial/commercial.module').then(m => m.CommercialModule),
    canActivate: [AuthGuard],
  },

  // Caisse (lazy-loaded)
  {
    path: 'accounting-day',
    loadChildren: () => import('./accounting-day/accounting-day.module').then(m => m.AccountingDayModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'cash-desk',
    loadChildren: () => import('./cash-desk/cash-desk.module').then(m => m.CashDeskModule),
    canActivate: [AuthGuard],
  },

  // Inventaire (lazy)
  {
    path: 'inventory',
    loadChildren: () => import('./inventory/inventory.module').then(m => m.InventoryModule),
    canActivate: [AuthGuard]
  },

  // Gestion (lazy-loaded)
  {
    path: 'gestion',
    loadChildren: () => import('./gestion/gestion.module').then(m => m.GestionModule),
    canActivate: [AuthGuard]
  },

  // Opérations (lazy-loaded)
  {
    path: 'operation',
    loadChildren: () => import('./operation/operation.module').then(m => m.OperationModule),
    canActivate: [AuthGuard]
  },

  // Dépôts (lazy-loaded)
  {
    path: 'deposit',
    loadChildren: () => import('./deposit/deposit.module').then(m => m.DepositModule),
    canActivate: [AuthGuard]
  },

  // Sorties (lazy-loaded)
  {
    path: 'out',
    loadChildren: () => import('./out/out.module').then(m => m.OutModule),
    canActivate: [AuthGuard]
  },

  // Historique (lazy-loaded)
  {
    path: 'history',
    loadChildren: () => import('./history/history.module').then(m => m.HistoryModule),
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
    path: 'debts',
    loadChildren: () => import('./debt/debt.module').then(m => m.DebtModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'carnet-ecarts',
    loadChildren: () => import('./carnet-ecart/carnet-ecart.module').then(m => m.CarnetEcartModule),
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
    path: 'configuration/mobile-money/frais-retrait',
    component: WithdrawalFeeGridComponent,
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
