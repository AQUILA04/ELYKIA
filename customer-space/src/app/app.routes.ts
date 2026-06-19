import { Routes } from '@angular/router';
import { CustomerAuthGuard } from './shared/guards/customer-auth.guard';

/** Routes principales — Espace Client ELYKIA. */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth.page').then(m => m.AuthPage),
  },
  {
    path: 'dashboard',
    canActivate: [CustomerAuthGuard],
    loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage),
  },
  {
    path: 'purchases',
    canActivate: [CustomerAuthGuard],
    loadComponent: () => import('./features/purchases/purchases.page').then(m => m.PurchasesPage),
  },
  {
    path: 'purchases/:id',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./features/purchase-detail/purchase-detail.page').then(m => m.PurchaseDetailPage),
  },
  {
    path: 'purchases/:id/timeline',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./features/recovery-timeline/recovery-timeline.page').then(m => m.RecoveryTimelinePage),
  },
  {
    path: 'payment/:id',
    canActivate: [CustomerAuthGuard],
    loadComponent: () => import('./features/payment/payment.page').then(m => m.PaymentPage),
  },
  {
    path: 'catalog',
    canActivate: [CustomerAuthGuard],
    loadComponent: () => import('./features/catalog/catalog.page').then(m => m.CatalogPage),
  },
  {
    path: 'cart',
    canActivate: [CustomerAuthGuard],
    loadComponent: () => import('./features/cart/cart.page').then(m => m.CartPage),
  },
  {
    path: 'order-confirmation',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./features/order-confirmation/order-confirmation.page').then(m => m.OrderConfirmationPage),
  },
  {
    path: 'orders/:id',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./features/order-tracking/order-tracking.page').then(m => m.OrderTrackingPage),
  },
  {
    path: 'profile',
    canActivate: [CustomerAuthGuard],
    loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage),
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];
