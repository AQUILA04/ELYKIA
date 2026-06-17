import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerAuthGuard } from './guards/customer-auth.guard';

/**
 * Routing du module Espace Client ELYKIA.
 * Toutes les routes protégées (sauf /auth) requièrent CustomerAuthGuard.
 *
 * Parcours couverts :
 *  - /customer/auth             → Connexion (S-01, S-02)
 *  - /customer/dashboard        → Tableau de bord (S-03)
 *  - /customer/purchases        → Historique achats (S-04)
 *  - /customer/purchases/:id    → Détail achat (S-05)
 *  - /customer/purchases/:id/timeline → Timeline recouvrements (S-06)
 *  - /customer/payment/:id      → Paiement Mobile Money (S-07, S-08)
 *  - /customer/catalog          → Catalogue produits (S-09)
 *  - /customer/cart             → Panier (S-10)
 *  - /customer/order-confirmation → Confirmation commande (S-11)
 *  - /customer/orders/:id       → Suivi commande
 *  - /customer/profile          → Profil client
 *
 * @author Francis AHONSU
 */
const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./pages/auth/customer-auth.page').then((m) => m.CustomerAuthPage),
  },
  {
    path: 'dashboard',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./pages/dashboard/customer-dashboard.page').then((m) => m.CustomerDashboardPage),
  },
  {
    path: 'purchases',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./pages/purchases/customer-purchases.page').then((m) => m.CustomerPurchasesPage),
  },
  {
    path: 'purchases/:id',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./pages/purchase-detail/customer-purchase-detail.page').then((m) => m.CustomerPurchaseDetailPage),
  },
  {
    path: 'purchases/:id/timeline',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./pages/recovery-timeline/customer-recovery-timeline.page').then((m) => m.CustomerRecoveryTimelinePage),
  },
  {
    path: 'payment/:distributionId',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./pages/payment/customer-payment.page').then((m) => m.CustomerPaymentPage),
  },
  {
    path: 'catalog',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./pages/catalog/customer-catalog.page').then((m) => m.CustomerCatalogPage),
  },
  {
    path: 'cart',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./pages/cart/customer-cart.page').then((m) => m.CustomerCartPage),
  },
  {
    path: 'order-confirmation',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./pages/order-confirmation/customer-order-confirmation.page').then((m) => m.CustomerOrderConfirmationPage),
  },
  {
    path: 'orders/:id',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./pages/order-tracking/customer-order-tracking.page').then((m) => m.CustomerOrderTrackingPage),
  },
  {
    path: 'profile',
    canActivate: [CustomerAuthGuard],
    loadComponent: () =>
      import('./pages/profile/customer-profile.page').then((m) => m.CustomerProfilePage),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomerSpaceRoutingModule {}
