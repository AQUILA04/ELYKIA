import { Routes } from '@angular/router';
import { NgxPermissionsGuard } from 'ngx-permissions';
import { MainLayoutComponent } from '@layout/shell/main-layout.component';
import { FeatureFlagGuard } from '@shared/guards/feature-flag.guard';
import { FeatureFlags } from '@shared/service/feature-flag.service';
import { AuthGuard } from './auth/guards/auth.guard';
import { AiChatGuard } from './ai-chat/guards/ai-chat.guard';

export const APP_ROUTES: Routes = [
  // Routes publiques plein écran (hors shell header/sidebar)
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'license',
    loadComponent: () =>
      import('./license/reactivate-license/reactivate-license.component').then(
        (m) => m.ReactivateLicenseComponent,
      ),
  },

  // === ROUTES PROTÉGÉES (Shell applicatif authentifié) ===
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },

      // Dashboard
      {
        path: 'home',
        loadChildren: () =>
          import('./dashboard/dashboard.module').then((m) => m.DashboardModule),
      },
      {
        path: 'chart',
        loadComponent: () =>
          import('./dashboard-chart/dashboard-chart.component').then(
            (m) => m.DashboardChartComponent,
          ),
      },

      // Commandes (Order Management)
      {
        path: 'orders',
        loadChildren: () =>
          import('./orders/orders.module').then((m) => m.OrdersModule),
        canActivate: [NgxPermissionsGuard],
        data: {
          permissions: {
            only: ['ROLE_CONSULT_CREDIT', 'ROLE_EDIT_CREDIT'],
            redirectTo: '/home',
          },
        },
      },

      // Services en ligne (Espace Client)
      {
        path: 'customer-payments',
        loadChildren: () =>
          import('./customer-payments/customer-payments.module').then(
            (m) => m.CustomerPaymentsModule,
          ),
      },
      {
        path: 'client-registrations',
        loadChildren: () =>
          import('./client-registrations/client-registrations.module').then(
            (m) => m.ClientRegistrationsModule,
          ),
        canActivate: [NgxPermissionsGuard],
        data: {
          permissions: {
            only: [
              'ROLE_VALIDATE_CLIENT_REGISTRATION',
              'ROLE_CONSULT_CLIENT',
              'ROLE_EDIT_CLIENT',
              'ROLE_ADMIN',
            ],
            redirectTo: '/home',
          },
        },
      },
      {
        path: 'audit',
        loadChildren: () =>
          import('./customer-activity-audit/customer-activity-audit.module').then(
            (m) => m.CustomerActivityAuditModule,
          ),
        canActivate: [NgxPermissionsGuard],
        data: {
          permissions: {
            only: ['ROLE_AUDIT'],
            redirectTo: '/home',
          },
        },
      },
      {
        path: 'notifications',
        loadChildren: () =>
          import('./notifications/notifications.module').then(
            (m) => m.NotificationsModule,
          ),
      },

      // BI Dashboard
      {
        path: 'bi',
        loadChildren: () => import('./bi/bi.module').then((m) => m.BiModule),
        canActivate: [NgxPermissionsGuard],
        data: {
          permissions: {
            only: ['ROLE_REPORT'],
            redirectTo: '/home',
          },
        },
      },

      // Elykia IA
      {
        path: 'ai-chat',
        loadChildren: () =>
          import('./ai-chat/ai-chat.module').then((m) => m.AiChatModule),
        canActivate: [NgxPermissionsGuard, AiChatGuard],
        data: {
          permissions: {
            only: ['ROLE_AI_CHAT'],
            redirectTo: '/home',
          },
        },
      },

      // Tontine
      {
        path: 'tontine',
        loadChildren: () =>
          import('./tontine/tontine.module').then((m) => m.TontineModule),
        canActivate: [NgxPermissionsGuard],
        data: {
          permissions: {
            only: [
              'ROLE_TONTINE',
              'ROLE_EDIT_TONTINE',
              'ROLE_CONSULT_TONTINE',
              'ROLE_ADMIN',
            ],
            redirectTo: '/home',
          },
        },
      },

      // Stock Commercial & redirection legacy Stock Tontine
      {
        path: 'stock',
        loadChildren: () =>
          import('./stock/stock.module').then((m) => m.StockModule),
      },
      {
        path: 'stock-tontine',
        loadChildren: () =>
          import('./stock/stock-legacy-redirect.module').then(
            (m) => m.StockLegacyRedirectModule,
          ),
      },

      // Catalogue & Référentiels
      {
        path: 'article',
        loadChildren: () =>
          import('./article/article.module').then((m) => m.ArticleModule),
      },
      {
        path: 'article-type',
        loadChildren: () =>
          import('./article-type/article-type.module').then(
            (m) => m.ArticleTypeModule,
          ),
      },
      {
        path: 'locality',
        loadChildren: () =>
          import('./locality/locality.module').then((m) => m.LocalityModule),
      },

      // Ventes, Crédits, Dettes, Écarts Carnet
      {
        path: 'credit',
        loadChildren: () =>
          import('./credit/credit.module').then((m) => m.CreditModule),
      },
      {
        path: 'debts',
        loadChildren: () =>
          import('./debt/debt.module').then((m) => m.DebtModule),
      },
      {
        path: 'carnet-ecarts',
        loadChildren: () =>
          import('./carnet-ecart/carnet-ecart.module').then(
            (m) => m.CarnetEcartModule,
          ),
      },

      // Clients, Comptes, Utilisateurs, Commerciaux
      {
        path: 'account',
        loadChildren: () =>
          import('./account/account.module').then((m) => m.AccountModule),
      },
      {
        path: 'client',
        loadChildren: () =>
          import('./client/client.module').then((m) => m.ClientModule),
      },
      {
        path: 'user',
        loadChildren: () =>
          import('./user/user.module').then((m) => m.UserModule),
      },
      {
        path: 'commercial',
        loadChildren: () =>
          import('./commercial/commercial.module').then(
            (m) => m.CommercialModule,
          ),
      },

      // Finance, Caisse, Inventaire, Opérations, Rapports
      {
        path: 'accounting-day',
        loadChildren: () =>
          import('./accounting-day/accounting-day.module').then(
            (m) => m.AccountingDayModule,
          ),
      },
      {
        path: 'cash-desk',
        loadChildren: () =>
          import('./cash-desk/cash-desk.module').then((m) => m.CashDeskModule),
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('./inventory/inventory.module').then((m) => m.InventoryModule),
      },
      {
        path: 'gestion',
        loadChildren: () =>
          import('./gestion/gestion.module').then((m) => m.GestionModule),
      },
      {
        path: 'operation',
        loadChildren: () =>
          import('./operation/operation.module').then((m) => m.OperationModule),
      },
      {
        path: 'deposit',
        loadChildren: () =>
          import('./deposit/deposit.module').then((m) => m.DepositModule),
      },
      {
        path: 'out',
        loadChildren: () => import('./out/out.module').then((m) => m.OutModule),
      },
      {
        path: 'history',
        loadChildren: () =>
          import('./history/history.module').then((m) => m.HistoryModule),
      },
      {
        path: 'report',
        loadChildren: () =>
          import('./report/report.module').then((m) => m.ReportModule),
      },
      {
        path: 'expense',
        loadChildren: () =>
          import('./expense/expense.module').then((m) => m.ExpenseModule),
      },

      // Sécurité, Paramètres & Configuration Mobile Money
      {
        path: 'security',
        loadChildren: () =>
          import('./security/security.module').then((m) => m.SecurityModule),
      },
      {
        path: 'parameters',
        loadChildren: () =>
          import('./parameters/parameters.module').then(
            (m) => m.ParametersModule,
          ),
      },
      {
        path: 'configuration/mobile-money/frais-retrait',
        loadComponent: () =>
          import(
            './mobile-money-config/withdrawal-fee-grid/withdrawal-fee-grid.component'
          ).then((m) => m.WithdrawalFeeGridComponent),
      },
      {
        path: 'configuration/mobile-money',
        loadComponent: () =>
          import(
            './mobile-money-config/mobile-money-config-list/mobile-money-config-list.component'
          ).then((m) => m.MobileMoneyConfigListComponent),
      },

      // Recrutement
      {
        path: 'recruitment',
        loadChildren: () =>
          import('./recruitment/recruitment.module').then(
            (m) => m.RecruitmentModule,
          ),
        canActivate: [NgxPermissionsGuard, FeatureFlagGuard],
        data: {
          featureFlag: FeatureFlags.Recruitment,
          permissions: {
            only: ['ROLE_ADMIN', 'ROLE_RECRUITMENT'],
            redirectTo: '/home',
          },
        },
      },
    ],
  },
];
