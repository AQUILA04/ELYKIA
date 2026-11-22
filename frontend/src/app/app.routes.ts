import { Routes } from '@angular/router';
import { NgxPermissionsGuard } from 'ngx-permissions';
import { MainLayoutComponent } from '@layout/shell/main-layout.component';
import { FeatureFlagGuard } from '@shared/guards/feature-flag.guard';
import { FeatureFlags } from '@shared/service/feature-flag.service';
import { AuthGuard } from '@features/auth/guards/auth.guard';
import { AiChatGuard } from '@features/ai-chat/guards/ai-chat.guard';

export const APP_ROUTES: Routes = [
  // Routes publiques plein écran (hors shell header/sidebar)
  {
    path: 'login',
    loadComponent: () =>
      import('@features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'license',
    loadComponent: () =>
      import('@features/license/reactivate-license/reactivate-license.component').then(
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
          import('@features/dashboard/dashboard.module').then((m) => m.DashboardModule),
      },
      {
        path: 'chart',
        loadComponent: () =>
          import('@features/dashboard-chart/dashboard-chart.component').then(
            (m) => m.DashboardChartComponent,
          ),
      },

      // Commandes (Order Management)
      {
        path: 'orders',
        loadChildren: () =>
          import('@features/orders/orders.module').then((m) => m.OrdersModule),
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
          import('@features/customer-payments/customer-payments.module').then(
            (m) => m.CustomerPaymentsModule,
          ),
      },
      {
        path: 'client-registrations',
        loadChildren: () =>
          import('@features/client-registrations/client-registrations.module').then(
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
          import('@features/customer-activity-audit/customer-activity-audit.module').then(
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
          import('@features/notifications/notifications.module').then(
            (m) => m.NotificationsModule,
          ),
      },

      // BI Dashboard
      {
        path: 'bi',
        loadChildren: () => import('@features/bi/bi.module').then((m) => m.BiModule),
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
          import('@features/ai-chat/ai-chat.module').then((m) => m.AiChatModule),
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
          import('@features/tontine/tontine.module').then((m) => m.TontineModule),
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
          import('@features/stock/stock.module').then((m) => m.StockModule),
      },
      {
        path: 'stock-tontine',
        loadChildren: () =>
          import('@features/stock/stock-legacy-redirect.module').then(
            (m) => m.StockLegacyRedirectModule,
          ),
      },

      // Catalogue & Référentiels
      {
        path: 'article',
        loadChildren: () =>
          import('@features/article/article.module').then((m) => m.ArticleModule),
      },
      {
        path: 'article-type',
        loadChildren: () =>
          import('@features/article-type/article-type.module').then(
            (m) => m.ArticleTypeModule,
          ),
      },
      {
        path: 'locality',
        loadChildren: () =>
          import('@features/locality/locality.module').then((m) => m.LocalityModule),
      },

      // Ventes, Crédits, Dettes, Écarts Carnet
      {
        path: 'credit',
        loadChildren: () =>
          import('@features/credit/credit.module').then((m) => m.CreditModule),
      },
      {
        path: 'debts',
        loadChildren: () =>
          import('@features/debt/debt.module').then((m) => m.DebtModule),
      },
      {
        path: 'carnet-ecarts',
        loadChildren: () =>
          import('@features/carnet-ecart/carnet-ecart.module').then(
            (m) => m.CarnetEcartModule,
          ),
      },

      // Clients, Comptes, Utilisateurs, Commerciaux
      {
        path: 'account',
        loadChildren: () =>
          import('@features/account/account.module').then((m) => m.AccountModule),
      },
      {
        path: 'client',
        loadChildren: () =>
          import('@features/client/client.module').then((m) => m.ClientModule),
      },
      {
        path: 'user',
        loadChildren: () =>
          import('@features/user/user.module').then((m) => m.UserModule),
      },
      {
        path: 'commercial',
        loadChildren: () =>
          import('@features/commercial/commercial.module').then(
            (m) => m.CommercialModule,
          ),
      },

      // Finance, Caisse, Inventaire, Opérations, Rapports
      {
        path: 'accounting-day',
        loadChildren: () =>
          import('@features/accounting-day/accounting-day.module').then(
            (m) => m.AccountingDayModule,
          ),
      },
      {
        path: 'cash-desk',
        loadChildren: () =>
          import('@features/cash-desk/cash-desk.module').then((m) => m.CashDeskModule),
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('@features/inventory/inventory.module').then((m) => m.InventoryModule),
      },
      {
        path: 'gestion',
        loadChildren: () =>
          import('@features/gestion/gestion.module').then((m) => m.GestionModule),
      },
      {
        path: 'operation',
        loadChildren: () =>
          import('@features/operation/operation.module').then((m) => m.OperationModule),
      },
      {
        path: 'deposit',
        loadChildren: () =>
          import('@features/deposit/deposit.module').then((m) => m.DepositModule),
      },
      {
        path: 'out',
        loadChildren: () => import('@features/out/out.module').then((m) => m.OutModule),
      },
      {
        path: 'history',
        loadChildren: () =>
          import('@features/history/history.module').then((m) => m.HistoryModule),
      },
      {
        path: 'report',
        loadChildren: () =>
          import('@features/report/report.module').then((m) => m.ReportModule),
      },
      {
        path: 'expense',
        loadChildren: () =>
          import('@features/expense/expense.module').then((m) => m.ExpenseModule),
      },

      // Administration — Entreprise & Charte graphique
      {
        path: 'administration/entreprise',
        loadChildren: () =>
          import('@features/company-settings/company-settings.routes').then(
            (m) => m.COMPANY_SETTINGS_ROUTES,
          ),
        canActivate: [NgxPermissionsGuard],
        data: {
          permissions: {
            only: ['ROLE_ADMIN'],
            redirectTo: '/home',
          },
        },
      },

      // Sécurité, Paramètres & Configuration Mobile Money
      {
        path: 'security',
        loadChildren: () =>
          import('@features/security/security.module').then((m) => m.SecurityModule),
      },
      {
        path: 'parameters',
        loadChildren: () =>
          import('@features/parameters/parameters.module').then(
            (m) => m.ParametersModule,
          ),
      },
      {
        path: 'configuration/mobile-money/frais-retrait',
        loadComponent: () =>
          import(
            '@features/mobile-money-config/withdrawal-fee-grid/withdrawal-fee-grid.component'
          ).then((m) => m.WithdrawalFeeGridComponent),
      },
      {
        path: 'configuration/mobile-money',
        loadComponent: () =>
          import(
            '@features/mobile-money-config/mobile-money-config-list/mobile-money-config-list.component'
          ).then((m) => m.MobileMoneyConfigListComponent),
      },

      // Recrutement
      {
        path: 'recruitment',
        loadChildren: () =>
          import('@features/recruitment/recruitment.module').then(
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
